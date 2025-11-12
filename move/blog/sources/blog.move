module blog::blog {
    // === Imports ===
    use sui::object::{Self as object, ID, UID};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::string::{Self as string, String};
    use std::vector;
    use sui::table::{Self as table, Table};
    use sui::clock::{Self as clock, Clock};
    use sui::bag::{Self as bag, Bag};

    // === Lỗi (Errors) ===
    const ENameTooShort: u64 = 0;
    const ENameTooLong: u64 = 1;
    const EBioTooLong: u64 = 2;
    const ETitleTooShort: u64 = 3;
    const ETitleTooLong: u64 = 4;
    const EContentTooShort: u64 = 5;
    const EContentTooLong: u64 = 6;
    const EProfileAlreadyExists: u64 = 7;
    const EUnauthorized: u64 = 8;
    const EProfileNotFound: u64 = 9;
    const EProfileIdMismatch: u64 = 10;
    /// CẢI TIẾN: Thêm error cho trường hợp không tìm thấy trong registry
    const EProfileNotInRegistry: u64 = 11;
    /// CẢI TIẾN: Thêm error cho trường hợp string chỉ chứa whitespace
    const EInvalidString: u64 = 12;
    /// Error cho trường hợp post count bị desync (count = 0 nhưng vẫn có posts)
    const EPostCountDesync: u64 = 13;

    // === Hằng số (Constants) ===
    const MIN_NAME_LENGTH: u64 = 3;
    const MAX_NAME_LENGTH: u64 = 50;
    const MAX_BIO_LENGTH: u64 = 200;
    const MIN_TITLE_LENGTH: u64 = 1;
    const MAX_TITLE_LENGTH: u64 = 100;
    const MIN_CONTENT_LENGTH: u64 = 1;
    const MAX_CONTENT_LENGTH: u64 = 10000;

    // === Structs (Cấu trúc) ===
    public struct ProfileRegistry has key, store {
        id: UID,
        profiles: Table<address, ID>,
    }

    /// CẢI TIẾN: Registry để track posts theo author
    /// Map: author_address -> Bag<post_id>
    /// 
    /// Lưu ý: authors table đã được xóa vì redundant - có thể check qua posts_by_author
    public struct PostRegistry has key, store {
        id: UID,
        posts_by_author: Table<address, Bag>,
        post_counts: Table<address, u64>, // Track số lượng posts của mỗi author
    }

    public struct UserProfile has key {
        id: UID,
        owner: address,
        name: String,
        bio: String,
        created_at: u64,
        updated_at: u64,
    }

    /// CẢI TIẾN: Thêm updated_at cho BlogPost
    public struct BlogPost has key, store {
        id: UID,
        author: address,
        title: String,
        content: String,
        created_at: u64,
        updated_at: u64, // CẢI TIẾN: Thêm field này
    }

    // === Structs cho View Functions ===
    public struct ProfileSummary has copy, drop {
        id: ID,
        owner: address,
        name: String,
        bio: String,
        created_at: u64,
        updated_at: u64,
    }

    public struct PostSummary has copy, drop {
        id: ID,
        author: address,
        title: String,
        content: String,
        created_at: u64,
        updated_at: u64, // CẢI TIẾN: Thêm field này
    }

    // === Events (Sự kiện) ===
    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        name: String,
    }

    public struct PostCreated has copy, drop {
        post_id: ID,
        author: address,
        title: String,
    }

    public struct ProfileUpdated has copy, drop {
        profile_id: ID,
        owner: address,
        field_updated: String, // CẢI TIẾN: Thêm field để biết field nào được update
    }

    public struct ProfileDeleted has copy, drop {
        profile_id: ID,
        owner: address,
    }

    public struct PostUpdated has copy, drop {
        post_id: ID,
        author: address,
        title: String, // CẢI TIẾN: Thêm title để dễ theo dõi thay đổi
    }

    public struct PostDeleted has copy, drop {
        post_id: ID,
        author: address,
    }

    // === Init Function ===
    fun init(ctx: &mut TxContext) {
        let profile_registry = ProfileRegistry {
            id: object::new(ctx),
            profiles: table::new(ctx),
        };
        transfer::share_object(profile_registry);

        let post_registry = PostRegistry {
            id: object::new(ctx),
            posts_by_author: table::new(ctx),
            post_counts: table::new(ctx),
        };
        transfer::share_object(post_registry);
    }

    // === Helper Functions ===
    /// Kiểm tra string không chỉ chứa whitespace
    /// 
    /// Hàm này kiểm tra xem string có chứa ít nhất một ký tự không phải whitespace không.
    /// 
    /// # Arguments
    /// * `s` - String cần kiểm tra
    /// 
    /// # Returns
    /// * `true` nếu string có ít nhất một ký tự không phải whitespace
    /// * `false` nếu string rỗng hoặc chỉ chứa whitespace
    /// 
    /// # Whitespace Characters Checked
    /// - Space (32)
    /// - Tab (9)
    /// - Newline (10)
    /// - Carriage return (13)
    /// 
    /// # Note
    /// Trong Move, String là UTF-8. Hàm này chỉ kiểm tra các whitespace ASCII phổ biến.
    /// Các whitespace Unicode khác (như non-breaking space) sẽ được coi là ký tự hợp lệ.
    fun is_valid_string(s: &String): bool {
        let len = string::length(s);
        if (len == 0) {
            return false
        };
        // Sử dụng string::as_bytes() để lấy vector<u8> reference
        // Sau đó dùng vector::borrow() để truy cập từng byte
        let bytes = string::as_bytes(s);
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(bytes, i);
            // Nếu tìm thấy ký tự không phải whitespace, string hợp lệ
            if (byte != 32 && byte != 9 && byte != 10 && byte != 13) {
                return true
            };
            i = i + 1;
        };
        false
    }

    // === Public Entry Functions ===
    /// Tạo hồ sơ người dùng mới
    public entry fun create_profile(
        registry: &mut ProfileRegistry,
        name: String,
        bio: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(!table::contains(&registry.profiles, sender), EProfileAlreadyExists);

        let name_len = string::length(&name);
        let bio_len = string::length(&bio);
        assert!(name_len >= MIN_NAME_LENGTH, ENameTooShort);
        assert!(name_len <= MAX_NAME_LENGTH, ENameTooLong);
        assert!(bio_len <= MAX_BIO_LENGTH, EBioTooLong);
        // CẢI TIẾN: Kiểm tra name và bio không chỉ là whitespace
        assert!(is_valid_string(&name), EInvalidString);
        // Cho phép bio rỗng hoặc chỉ whitespace (optional field)
        // Nhưng nếu có bio thì phải hợp lệ
        if (bio_len > 0) {
            assert!(is_valid_string(&bio), EInvalidString);
        };

        let now = clock::timestamp_ms(clock);
        let profile = UserProfile {
            id: object::new(ctx),
            owner: sender,
            name: name,
            bio: bio,
            created_at: now,
            updated_at: now,
        };
        let profile_id = object::id(&profile);

        table::add(&mut registry.profiles, sender, profile_id);

        event::emit(ProfileCreated {
            profile_id: profile_id,
            owner: sender,
            name: profile.name,
        });

        transfer::transfer(profile, sender);
    }

    /// Tạo một bài blog mới
    public entry fun create_post(
        profile_registry: &ProfileRegistry,
        post_registry: &mut PostRegistry,
        title: String,
        content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(table::contains(&profile_registry.profiles, sender), EProfileNotFound);

        let title_len = string::length(&title);
        let content_len = string::length(&content);
        assert!(title_len >= MIN_TITLE_LENGTH, ETitleTooShort);
        assert!(title_len <= MAX_TITLE_LENGTH, ETitleTooLong);
        assert!(content_len >= MIN_CONTENT_LENGTH, EContentTooShort);
        assert!(content_len <= MAX_CONTENT_LENGTH, EContentTooLong);
        // CẢI TIẾN: Kiểm tra title và content không chỉ là whitespace
        assert!(is_valid_string(&title), EInvalidString);
        assert!(is_valid_string(&content), EInvalidString);

        let now = clock::timestamp_ms(clock);
        let post = BlogPost {
            id: object::new(ctx),
            author: sender,
            title: title,
            content: content,
            created_at: now,
            updated_at: now, // CẢI TIẾN: Khởi tạo updated_at
        };

        let post_id = object::id(&post);

        // CẢI TIẾN: Register post vào PostRegistry
        // Đảm bảo bag entry tồn tại
        if (!table::contains(&post_registry.posts_by_author, sender)) {
            let posts_bag = bag::new(ctx);
            table::add(&mut post_registry.posts_by_author, sender, posts_bag);
        };
        // Đảm bảo count entry tồn tại (có thể đã bị cleanup trước đó nếu count = 0)
        if (!table::contains(&post_registry.post_counts, sender)) {
            table::add(&mut post_registry.post_counts, sender, 0);
        };
        let posts_bag = table::borrow_mut(&mut post_registry.posts_by_author, sender);
        // Lưu ý: Bag trong Sui yêu cầu cả key và value
        // Giá trị `true` ở đây chỉ là placeholder, không có ý nghĩa logic
        // Có thể dùng `()` nếu Bag hỗ trợ, nhưng hiện tại phải dùng bool
        bag::add(posts_bag, post_id, true);
        // Update count
        let count = table::borrow_mut(&mut post_registry.post_counts, sender);
        *count = *count + 1;

        event::emit(PostCreated {
            post_id: post_id,
            author: sender,
            title: post.title,
        });

        transfer::transfer(post, sender);
    }

    /// Cập nhật tiểu sử hồ sơ
    public entry fun update_profile_bio(
        profile: &mut UserProfile,
        new_bio: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == ctx.sender(), EUnauthorized);
        
        let bio_len = string::length(&new_bio);
        assert!(bio_len <= MAX_BIO_LENGTH, EBioTooLong);
        // CẢI TIẾN: Kiểm tra bio không chỉ là whitespace (cho phép rỗng)
        if (bio_len > 0) {
            assert!(is_valid_string(&new_bio), EInvalidString);
        };
        
        profile.bio = new_bio;
        profile.updated_at = clock::timestamp_ms(clock);
        
        event::emit(ProfileUpdated {
            profile_id: object::id(profile),
            owner: profile.owner,
            field_updated: string::utf8(b"bio"), // CẢI TIẾN: Thêm thông tin field được update
        });
    }

    /// Cập nhật tên hồ sơ
    public entry fun update_profile_name(
        profile: &mut UserProfile,
        name: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == ctx.sender(), EUnauthorized);
        
        let name_len = string::length(&name);
        assert!(name_len >= MIN_NAME_LENGTH, ENameTooShort);
        assert!(name_len <= MAX_NAME_LENGTH, ENameTooLong);
        // CẢI TIẾN: Kiểm tra name không chỉ là whitespace
        assert!(is_valid_string(&name), EInvalidString);
        
        profile.name = name;
        profile.updated_at = clock::timestamp_ms(clock);
        
        event::emit(ProfileUpdated {
            profile_id: object::id(profile),
            owner: profile.owner,
            field_updated: string::utf8(b"name"), // CẢI TIẾN: Thêm thông tin field được update
        });
    }

    /// Cập nhật bài blog
    public entry fun update_post(
        post: &mut BlogPost,
        title: String,
        content: String,
        clock: &Clock, // CẢI TIẾN: Uncomment và sử dụng
        ctx: &mut TxContext
    ) {
        assert!(post.author == ctx.sender(), EUnauthorized);
        
        let title_len = string::length(&title);
        let content_len = string::length(&content);
        assert!(title_len >= MIN_TITLE_LENGTH, ETitleTooShort);
        assert!(title_len <= MAX_TITLE_LENGTH, ETitleTooLong);
        assert!(content_len >= MIN_CONTENT_LENGTH, EContentTooShort);
        assert!(content_len <= MAX_CONTENT_LENGTH, EContentTooLong);
        // CẢI TIẾN: Kiểm tra title và content không chỉ là whitespace
        assert!(is_valid_string(&title), EInvalidString);
        assert!(is_valid_string(&content), EInvalidString);
        
        post.title = title;
        post.content = content;
        post.updated_at = clock::timestamp_ms(clock); // CẢI TIẾN: Uncomment và sử dụng
        
        event::emit(PostUpdated {
            post_id: object::id(post),
            author: post.author,
            title: post.title, // CẢI TIẾN: Thêm title để dễ theo dõi
        });
    }

    /// Xóa hồ sơ người dùng
    public entry fun delete_profile(
        registry: &mut ProfileRegistry,
        profile: UserProfile,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(profile.owner == sender, EUnauthorized);
        let owner_address = profile.owner;
        let passed_profile_id = object::id(&profile);
        
        // CẢI TIẾN: Kiểm tra profile có trong registry không
        assert!(table::contains(&registry.profiles, owner_address), EProfileNotInRegistry);
        
        let registered_profile_id = table::remove(&mut registry.profiles, owner_address);
        assert!(registered_profile_id == passed_profile_id, EProfileIdMismatch);
        
        event::emit(ProfileDeleted {
            profile_id: passed_profile_id,
            owner: owner_address
        });
        
        let UserProfile { id, owner: _, name: _, bio: _, created_at: _, updated_at: _ } = profile;
        object::delete(id);
    }

    /// Xóa bài blog
    public entry fun delete_post(
        post_registry: &mut PostRegistry,
        post: BlogPost,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(post.author == sender, EUnauthorized);
        
        let post_id = object::id(&post);
        let author = post.author;

        // CẢI TIẾN: Remove post khỏi PostRegistry
        if (table::contains(&post_registry.posts_by_author, author)) {
            let posts_bag = table::borrow_mut(&mut post_registry.posts_by_author, author);
            if (bag::contains(posts_bag, post_id)) {
                let _value: bool = bag::remove(posts_bag, post_id);
            };
        };
        
        // Update count sau khi đã release borrow từ posts_bag
        if (table::contains(&post_registry.post_counts, author)) {
            let count = table::borrow_mut(&mut post_registry.post_counts, author);
            assert!(*count > 0, EPostCountDesync);
            *count = *count - 1;
            // Lưu giá trị để check cleanup sau
        };
        
        // CẢI TIẾN: Giữ count entry = 0 để đồng bộ với bag
        // Note: We don't remove the empty bag from posts_by_author because
        // Bag struct doesn't have drop ability and we can't destructure it
        // outside its module. We also keep the count entry = 0 to maintain
        // consistency between count and bag state.
        
        event::emit(PostDeleted {
            post_id: post_id,
            author: author
        });
        
        let BlogPost { id, author: _, title: _, content: _, created_at: _, updated_at: _ } = post;
        object::delete(id);
    }

    // === Hàm chỉ đọc (View Functions) ===
    /// CẢI TIẾN: Lấy profile_id từ registry theo address
    public fun get_profile_id_by_address(
        registry: &ProfileRegistry,
        owner: address
    ): ID {
        assert!(table::contains(&registry.profiles, owner), EProfileNotFound);
        *table::borrow(&registry.profiles, owner)
    }

    /// Kiểm tra xem address có profile chưa
    public fun has_profile(
        registry: &ProfileRegistry,
        owner: address
    ): bool {
        table::contains(&registry.profiles, owner)
    }

    /// Lấy toàn bộ thông tin hồ sơ
    public fun get_profile_summary(profile: &UserProfile): ProfileSummary {
        ProfileSummary {
            id: object::id(profile),
            owner: profile.owner,
            name: profile.name,
            bio: profile.bio,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
        }
    }

    /// Lấy toàn bộ thông tin bài post
    public fun get_post_summary(post: &BlogPost): PostSummary {
        PostSummary {
            id: object::id(post),
            author: post.author,
            title: post.title,
            content: post.content,
            created_at: post.created_at,

            updated_at: post.updated_at, // CẢI TIẾN: Thêm field này
        }
    }

    // Các hàm get_* cũ vẫn hữu ích nếu chỉ cần 1 trường
    public fun get_profile_name(profile: &UserProfile): String {
        profile.name
    }

    public fun get_profile_bio(profile: &UserProfile): String {
        profile.bio
    }

    public fun get_post_content(post: &BlogPost): String {
        post.content
    }

    public fun get_post_title(post: &BlogPost): String {
        post.title
    }

    public fun get_post_author(post: &BlogPost): address {
        post.author
    }

    // === CẢI TIẾN: Functions để query posts theo author ===
    
    /// Kiểm tra xem author có posts không
    /// CẢI TIẾN: Check cả count > 0 để tránh inconsistency với empty bag
    public fun author_has_posts(
        post_registry: &PostRegistry,
        author: address
    ): bool {
        if (!table::contains(&post_registry.post_counts, author)) {
            return false
        };
        let count = *table::borrow(&post_registry.post_counts, author);
        count > 0 && table::contains(&post_registry.posts_by_author, author)
    }

    /// Lấy số lượng posts của một author
    public fun get_author_post_count(
        post_registry: &PostRegistry,
        author: address
    ): u64 {
        if (!table::contains(&post_registry.post_counts, author)) {
            return 0
        };
        *table::borrow(&post_registry.post_counts, author)
    }

    /// Kiểm tra xem một post ID có trong bag của author không
    /// Lưu ý: Hàm này chỉ kiểm tra, không trả về danh sách
    /// Để lấy danh sách posts, cần query off-chain qua events hoặc objects
    public fun author_has_post(
        post_registry: &PostRegistry,
        author: address,
        post_id: ID
    ): bool {
        if (!table::contains(&post_registry.posts_by_author, author)) {
            return false
        };
        let posts_bag = table::borrow(&post_registry.posts_by_author, author);
        bag::contains(posts_bag, post_id)
    }

    /// Kiểm tra xem một address có phải là author có posts không
    /// 
    /// CẢI TIẾN: Check cả count > 0 để tránh inconsistency với empty bag
    public fun is_author(
        post_registry: &PostRegistry,
        address: address
    ): bool {
        if (!table::contains(&post_registry.post_counts, address)) {
            return false
        };
        let count = *table::borrow(&post_registry.post_counts, address);
        count > 0 && table::contains(&post_registry.posts_by_author, address)
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
