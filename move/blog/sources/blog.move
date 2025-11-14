module blog::blog {
    // === Imports ===
    use sui::object::{Self as object, ID, UID};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::string::{Self as string, String};
    use std::vector;
    use std::option::{Self as option, Option};
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
    /// Error cho trường hợp đã like post rồi
    const EAlreadyLiked: u64 = 14;
    /// Error cho trường hợp chưa like post
    const ENotLiked: u64 = 15;
    /// Error cho trường hợp đã follow user rồi
    const EAlreadyFollowing: u64 = 16;
    /// Error cho trường hợp chưa follow user
    const ENotFollowing: u64 = 17;
    /// Error cho trường hợp không thể follow chính mình
    const ECannotFollowSelf: u64 = 18;
    /// Error cho trường hợp comment content quá ngắn
    const ECommentTooShort: u64 = 19;
    /// Error cho trường hợp comment content quá dài
    const ECommentTooLong: u64 = 20;
    /// Error cho trường hợp comment không tồn tại
    const ECommentNotFound: u64 = 21;

    // === Hằng số (Constants) ===
    const MIN_NAME_LENGTH: u64 = 3;
    const MAX_NAME_LENGTH: u64 = 50;
    const MAX_BIO_LENGTH: u64 = 200;
    const MIN_TITLE_LENGTH: u64 = 1;
    const MAX_TITLE_LENGTH: u64 = 100;
    const MIN_CONTENT_LENGTH: u64 = 1;
    const MAX_CONTENT_LENGTH: u64 = 10000;
    const MIN_COMMENT_LENGTH: u64 = 1;
    const MAX_COMMENT_LENGTH: u64 = 1000;

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

    /// Registry để track likes cho posts
    /// Map: post_id -> Table<user_address, bool>
    public struct LikeRegistry has key, store {
        id: UID,
        likes: Table<ID, Table<address, bool>>, // post_id -> (user_address -> true)
        like_counts: Table<ID, u64>, // post_id -> like_count
    }

    /// Registry để track follows giữa users
    /// Map: user_address -> Table<following_address, bool>
    public struct FollowRegistry has key, store {
        id: UID,
        followers: Table<address, Table<address, bool>>, // user -> (follower -> true)
        following: Table<address, Table<address, bool>>, // user -> (following -> true)
    }

    /// Registry để track comments cho posts
    public struct CommentRegistry has key, store {
        id: UID,
        comments_by_post: Table<ID, Bag>, // post_id -> Bag<comment_id>
        comment_counts: Table<ID, u64>, // post_id -> comment_count
    }

    /// Registry để track bookmarks của users
    public struct BookmarkRegistry has key, store {
        id: UID,
        bookmarks: Table<address, Bag>, // user_address -> Bag<post_id>
    }

    public struct UserProfile has key {
        id: UID,
        owner: address,
        name: String,
        bio: String,
        created_at: u64,
        updated_at: u64,
        follower_count: u64, // Số lượng followers
        following_count: u64, // Số lượng following
        pinned_post_id: Option<ID>, // Post được pin lên đầu profile
    }

    /// CẢI TIẾN: Thêm updated_at cho BlogPost
    public struct BlogPost has key, store {
        id: UID,
        author: address,
        title: String,
        content: String,
        created_at: u64,
        updated_at: u64, // CẢI TIẾN: Thêm field này
        like_count: u64, // Số lượng likes
        comment_count: u64, // Số lượng comments
    }

    /// Comment struct để lưu comment hoặc reply
    public struct Comment has key, store {
        id: UID,
        post_id: ID,
        author: address,
        content: String,
        parent_comment_id: Option<ID>, // None = top-level comment, Some(id) = reply
        created_at: u64,
        updated_at: u64,
    }

    // === Structs cho View Functions ===
    public struct ProfileSummary has copy, drop {
        id: ID,
        owner: address,
        name: String,
        bio: String,
        created_at: u64,
        updated_at: u64,
        follower_count: u64, // Số lượng followers
        following_count: u64, // Số lượng following
    }

    public struct PostSummary has copy, drop {
        id: ID,
        author: address,
        title: String,
        content: String,
        created_at: u64,
        updated_at: u64, // CẢI TIẾN: Thêm field này
        like_count: u64, // Số lượng likes
        comment_count: u64, // Số lượng comments
    }

    public struct CommentSummary has copy, drop {
        id: ID,
        post_id: ID,
        author: address,
        content: String,
        parent_comment_id: Option<ID>,
        created_at: u64,
        updated_at: u64,
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

    public struct PostLiked has copy, drop {
        post_id: ID,
        user: address,
        author: address,
    }

    public struct PostUnliked has copy, drop {
        post_id: ID,
        user: address,
        author: address,
    }

    public struct UserFollowed has copy, drop {
        follower: address,
        following: address,
    }

    public struct UserUnfollowed has copy, drop {
        follower: address,
        following: address,
    }

    public struct CommentCreated has copy, drop {
        comment_id: ID,
        post_id: ID,
        author: address,
        parent_comment_id: Option<ID>,
    }

    public struct CommentUpdated has copy, drop {
        comment_id: ID,
        post_id: ID,
        author: address,
    }

    public struct CommentDeleted has copy, drop {
        comment_id: ID,
        post_id: ID,
        author: address,
    }

    public struct PostBookmarked has copy, drop {
        post_id: ID,
        user: address,
    }

    public struct PostUnbookmarked has copy, drop {
        post_id: ID,
        user: address,
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

        let like_registry = LikeRegistry {
            id: object::new(ctx),
            likes: table::new(ctx),
            like_counts: table::new(ctx),
        };
        transfer::share_object(like_registry);

        let follow_registry = FollowRegistry {
            id: object::new(ctx),
            followers: table::new(ctx),
            following: table::new(ctx),
        };
        transfer::share_object(follow_registry);

        let comment_registry = CommentRegistry {
            id: object::new(ctx),
            comments_by_post: table::new(ctx),
            comment_counts: table::new(ctx),
        };
        transfer::share_object(comment_registry);

        let bookmark_registry = BookmarkRegistry {
            id: object::new(ctx),
            bookmarks: table::new(ctx),
        };
        transfer::share_object(bookmark_registry);
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
            follower_count: 0, // Khởi tạo follower_count = 0
            following_count: 0, // Khởi tạo following_count = 0
            pinned_post_id: option::none(), // Khởi tạo pinned_post_id = None
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
            like_count: 0, // Khởi tạo like_count = 0
            comment_count: 0, // Khởi tạo comment_count = 0
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
        
        let UserProfile { id, owner: _, name: _, bio: _, created_at: _, updated_at: _, follower_count: _, following_count: _, pinned_post_id: _ } = profile;
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
        
        let BlogPost { id, author: _, title: _, content: _, created_at: _, updated_at: _, like_count: _, comment_count: _ } = post;
        object::delete(id);
    }

    // === Like/Unlike Functions ===
    /// Like một post
    public entry fun like_post(
        post: &mut BlogPost,
        like_registry: &mut LikeRegistry,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let post_id = object::id(post);
        
        // Đảm bảo entry tồn tại trong likes table
        if (!table::contains(&like_registry.likes, post_id)) {
            let likes_table = table::new(ctx);
            table::add(&mut like_registry.likes, post_id, likes_table);
        };
        
        // Kiểm tra đã like chưa
        let likes_table = table::borrow_mut(&mut like_registry.likes, post_id);
        assert!(!table::contains(likes_table, sender), EAlreadyLiked);
        
        // Thêm like
        table::add(likes_table, sender, true);
        
        // Update like count trong post
        post.like_count = post.like_count + 1;
        
        // Update like count trong registry
        if (!table::contains(&like_registry.like_counts, post_id)) {
            table::add(&mut like_registry.like_counts, post_id, 0);
        };
        let count = table::borrow_mut(&mut like_registry.like_counts, post_id);
        *count = *count + 1;
        
        event::emit(PostLiked {
            post_id: post_id,
            user: sender,
            author: post.author,
        });
    }

    /// Unlike một post
    public entry fun unlike_post(
        post: &mut BlogPost,
        like_registry: &mut LikeRegistry,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let post_id = object::id(post);
        
        // Kiểm tra entry tồn tại
        assert!(table::contains(&like_registry.likes, post_id), ENotLiked);
        
        let likes_table = table::borrow_mut(&mut like_registry.likes, post_id);
        assert!(table::contains(likes_table, sender), ENotLiked);
        
        // Remove like
        let _value = table::remove(likes_table, sender);
        
        // Update like count trong post
        assert!(post.like_count > 0, EPostCountDesync);
        post.like_count = post.like_count - 1;
        
        // Update like count trong registry
        if (table::contains(&like_registry.like_counts, post_id)) {
            let count = table::borrow_mut(&mut like_registry.like_counts, post_id);
            assert!(*count > 0, EPostCountDesync);
            *count = *count - 1;
        };
        
        event::emit(PostUnliked {
            post_id: post_id,
            user: sender,
            author: post.author,
        });
    }

    // === Follow/Unfollow Functions ===
    /// Follow một user
    /// CẢI TIẾN: Chỉ cần following_address thay vì following_profile object
    /// Vì following_profile được owned bởi người khác, không thể truyền vào transaction
    public entry fun follow_user(
        follower_profile: &mut UserProfile,
        profile_registry: &ProfileRegistry,
        following_address: address, // CẢI TIẾN: Chỉ cần address, không cần object
        follow_registry: &mut FollowRegistry,
        ctx: &mut TxContext
    ) {
        let follower = ctx.sender();
        let following = following_address;
        
        // Không thể follow chính mình
        assert!(follower != following, ECannotFollowSelf);
        
        // Kiểm tra follower là owner của follower_profile
        assert!(follower_profile.owner == follower, EUnauthorized);
        
        // Kiểm tra following_address có profile không
        assert!(table::contains(&profile_registry.profiles, following), EProfileNotFound);
        
        // Đảm bảo entry tồn tại trong following table của follower
        if (!table::contains(&follow_registry.following, follower)) {
            let following_table = table::new(ctx);
            table::add(&mut follow_registry.following, follower, following_table);
        };
        
        // Đảm bảo entry tồn tại trong followers table của following
        if (!table::contains(&follow_registry.followers, following)) {
            let followers_table = table::new(ctx);
            table::add(&mut follow_registry.followers, following, followers_table);
        };
        
        // Kiểm tra đã follow chưa
        let following_table = table::borrow_mut(&mut follow_registry.following, follower);
        assert!(!table::contains(following_table, following), EAlreadyFollowing);
        
        // Thêm vào following table của follower
        table::add(following_table, following, true);
        
        // Thêm vào followers table của following
        let followers_table = table::borrow_mut(&mut follow_registry.followers, following);
        table::add(followers_table, follower, true);
        
        // Update count - chỉ update follower_profile vì following_profile không thể mutate
        follower_profile.following_count = follower_profile.following_count + 1;
        // CẢI TIẾN: following_profile.follower_count sẽ được update off-chain hoặc qua event
        // Vì following_profile được owned bởi người khác, không thể mutate trong transaction này
        
        event::emit(UserFollowed {
            follower: follower,
            following: following,
        });
    }

    /// Unfollow một user
    /// CẢI TIẾN: Chỉ cần following_address thay vì following_profile object
    /// Vì following_profile được owned bởi người khác, không thể truyền vào transaction
    public entry fun unfollow_user(
        follower_profile: &mut UserProfile,
        following_address: address, // CẢI TIẾN: Chỉ cần address, không cần object
        follow_registry: &mut FollowRegistry,
        ctx: &mut TxContext
    ) {
        let follower = ctx.sender();
        let following = following_address;
        
        // Kiểm tra follower là owner của follower_profile
        assert!(follower_profile.owner == follower, EUnauthorized);
        
        // Kiểm tra entry tồn tại
        assert!(table::contains(&follow_registry.following, follower), ENotFollowing);
        
        let following_table = table::borrow_mut(&mut follow_registry.following, follower);
        assert!(table::contains(following_table, following), ENotFollowing);
        
        // Remove từ following table của follower
        let _value = table::remove(following_table, following);
        
        // Remove từ followers table của following
        if (table::contains(&follow_registry.followers, following)) {
            let followers_table = table::borrow_mut(&mut follow_registry.followers, following);
            if (table::contains(followers_table, follower)) {
                let _value2 = table::remove(followers_table, follower);
            };
        };
        
        // Update count - chỉ update follower_profile vì following_profile không thể mutate
        assert!(follower_profile.following_count > 0, EPostCountDesync);
        follower_profile.following_count = follower_profile.following_count - 1;
        // CẢI TIẾN: following_profile.follower_count sẽ được update off-chain hoặc qua event
        // Vì following_profile được owned bởi người khác, không thể mutate trong transaction này
        
        event::emit(UserUnfollowed {
            follower: follower,
            following: following,
        });
    }

    // === Comment Functions ===
    /// Tạo một comment hoặc reply
    public entry fun create_comment(
        profile_registry: &ProfileRegistry,
        post: &mut BlogPost,
        comment_registry: &mut CommentRegistry,
        content: String,
        parent_comment_id: Option<ID>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(table::contains(&profile_registry.profiles, sender), EProfileNotFound);
        
        let content_len = string::length(&content);
        assert!(content_len >= MIN_COMMENT_LENGTH, ECommentTooShort);
        assert!(content_len <= MAX_COMMENT_LENGTH, ECommentTooLong);
        assert!(is_valid_string(&content), EInvalidString);
        
        let now = clock::timestamp_ms(clock);
        let comment = Comment {
            id: object::new(ctx),
            post_id: object::id(post),
            author: sender,
            content: content,
            parent_comment_id: parent_comment_id,
            created_at: now,
            updated_at: now,
        };
        
        let comment_id = object::id(&comment);
        let post_id = object::id(post);
        
        // Đảm bảo entry tồn tại trong comments_by_post
        if (!table::contains(&comment_registry.comments_by_post, post_id)) {
            let comments_bag = bag::new(ctx);
            table::add(&mut comment_registry.comments_by_post, post_id, comments_bag);
        };
        
        // Đảm bảo count entry tồn tại
        if (!table::contains(&comment_registry.comment_counts, post_id)) {
            table::add(&mut comment_registry.comment_counts, post_id, 0);
        };
        
        // Thêm comment vào bag
        let comments_bag = table::borrow_mut(&mut comment_registry.comments_by_post, post_id);
        bag::add(comments_bag, comment_id, true);
        
        // Update count
        let count = table::borrow_mut(&mut comment_registry.comment_counts, post_id);
        *count = *count + 1;
        
        // Update comment count trong post
        post.comment_count = post.comment_count + 1;
        
        event::emit(CommentCreated {
            comment_id: comment_id,
            post_id: post_id,
            author: sender,
            parent_comment_id: parent_comment_id,
        });
        
        transfer::transfer(comment, sender);
    }

    /// Cập nhật một comment
    public entry fun update_comment(
        comment: &mut Comment,
        new_content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(comment.author == ctx.sender(), EUnauthorized);
        
        let content_len = string::length(&new_content);
        assert!(content_len >= MIN_COMMENT_LENGTH, ECommentTooShort);
        assert!(content_len <= MAX_COMMENT_LENGTH, ECommentTooLong);
        assert!(is_valid_string(&new_content), EInvalidString);
        
        comment.content = new_content;
        comment.updated_at = clock::timestamp_ms(clock);
        
        event::emit(CommentUpdated {
            comment_id: object::id(comment),
            post_id: comment.post_id,
            author: comment.author,
        });
    }

    /// Xóa một comment
    public entry fun delete_comment(
        post: &mut BlogPost,
        comment_registry: &mut CommentRegistry,
        comment: Comment,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(comment.author == sender, EUnauthorized);
        
        let comment_id = object::id(&comment);
        let post_id = comment.post_id;
        
        // Remove comment khỏi registry
        if (table::contains(&comment_registry.comments_by_post, post_id)) {
            let comments_bag = table::borrow_mut(&mut comment_registry.comments_by_post, post_id);
            if (bag::contains(comments_bag, comment_id)) {
                let _value: bool = bag::remove(comments_bag, comment_id);
            };
        };
        
        // Update count
        if (table::contains(&comment_registry.comment_counts, post_id)) {
            let count = table::borrow_mut(&mut comment_registry.comment_counts, post_id);
            assert!(*count > 0, EPostCountDesync);
            *count = *count - 1;
        };
        
        // Update comment count trong post
        assert!(post.comment_count > 0, EPostCountDesync);
        post.comment_count = post.comment_count - 1;
        
        event::emit(CommentDeleted {
            comment_id: comment_id,
            post_id: post_id,
            author: comment.author,
        });
        
        let Comment { id, post_id: _, author: _, content: _, parent_comment_id: _, created_at: _, updated_at: _ } = comment;
        object::delete(id);
    }

    // === Bookmark Functions ===
    /// Bookmark một post
    public entry fun bookmark_post(
        profile_registry: &ProfileRegistry,
        bookmark_registry: &mut BookmarkRegistry,
        post_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(table::contains(&profile_registry.profiles, sender), EProfileNotFound);
        
        // Đảm bảo entry tồn tại
        if (!table::contains(&bookmark_registry.bookmarks, sender)) {
            let bookmarks_bag = bag::new(ctx);
            table::add(&mut bookmark_registry.bookmarks, sender, bookmarks_bag);
        };
        
        let bookmarks_bag = table::borrow_mut(&mut bookmark_registry.bookmarks, sender);
        
        // Kiểm tra đã bookmark chưa
        assert!(!bag::contains(bookmarks_bag, post_id), EAlreadyLiked); // Reuse error code
        
        // Thêm bookmark
        bag::add(bookmarks_bag, post_id, true);
        
        event::emit(PostBookmarked {
            post_id: post_id,
            user: sender,
        });
    }

    /// Unbookmark một post
    public entry fun unbookmark_post(
        bookmark_registry: &mut BookmarkRegistry,
        post_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        
        // Kiểm tra entry tồn tại
        assert!(table::contains(&bookmark_registry.bookmarks, sender), ENotLiked); // Reuse error code
        
        let bookmarks_bag = table::borrow_mut(&mut bookmark_registry.bookmarks, sender);
        assert!(bag::contains(bookmarks_bag, post_id), ENotLiked); // Reuse error code
        
        // Remove bookmark
        let _value: bool = bag::remove(bookmarks_bag, post_id);
        
        event::emit(PostUnbookmarked {
            post_id: post_id,
            user: sender,
        });
    }

    // === Post Pinning Functions ===
    /// Pin một post lên đầu profile
    public entry fun pin_post(
        profile: &mut UserProfile,
        post: &BlogPost,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == ctx.sender(), EUnauthorized);
        assert!(post.author == profile.owner, EUnauthorized); // Chỉ có thể pin post của chính mình
        
        profile.pinned_post_id = option::some(object::id(post));
    }

    /// Unpin post khỏi profile
    public entry fun unpin_post(
        profile: &mut UserProfile,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == ctx.sender(), EUnauthorized);
        
        profile.pinned_post_id = option::none();
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
            follower_count: profile.follower_count,
            following_count: profile.following_count,
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
            like_count: post.like_count, // Số lượng likes
            comment_count: post.comment_count, // Số lượng comments
        }
    }

    /// Lấy toàn bộ thông tin comment
    public fun get_comment_summary(comment: &Comment): CommentSummary {
        CommentSummary {
            id: object::id(comment),
            post_id: comment.post_id,
            author: comment.author,
            content: comment.content,
            parent_comment_id: comment.parent_comment_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
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

    /// Kiểm tra xem user đã like post chưa
    public fun has_liked(
        like_registry: &LikeRegistry,
        post_id: ID,
        user: address
    ): bool {
        if (!table::contains(&like_registry.likes, post_id)) {
            return false
        };
        let likes_table = table::borrow(&like_registry.likes, post_id);
        table::contains(likes_table, user)
    }

    /// Lấy số lượng likes của một post
    public fun get_post_like_count(
        like_registry: &LikeRegistry,
        post_id: ID
    ): u64 {
        if (!table::contains(&like_registry.like_counts, post_id)) {
            return 0
        };
        *table::borrow(&like_registry.like_counts, post_id)
    }

    /// Lấy số lượng likes từ post object
    public fun get_post_like_count_from_object(post: &BlogPost): u64 {
        post.like_count
    }

    /// Kiểm tra xem user có đang follow target user không
    public fun is_following(
        follow_registry: &FollowRegistry,
        follower: address,
        following: address
    ): bool {
        if (!table::contains(&follow_registry.following, follower)) {
            return false
        };
        let following_table = table::borrow(&follow_registry.following, follower);
        table::contains(following_table, following)
    }

    /// Lấy số lượng followers của một user
    public fun get_follower_count(profile: &UserProfile): u64 {
        profile.follower_count
    }

    /// Lấy số lượng following của một user
    public fun get_following_count(profile: &UserProfile): u64 {
        profile.following_count
    }

    /// Lấy số lượng comments của một post
    public fun get_post_comment_count(
        comment_registry: &CommentRegistry,
        post_id: ID
    ): u64 {
        if (!table::contains(&comment_registry.comment_counts, post_id)) {
            return 0
        };
        *table::borrow(&comment_registry.comment_counts, post_id)
    }

    /// Lấy số lượng comments từ post object
    public fun get_post_comment_count_from_object(post: &BlogPost): u64 {
        post.comment_count
    }

    /// Kiểm tra xem một comment ID có trong bag của post không
    public fun post_has_comment(
        comment_registry: &CommentRegistry,
        post_id: ID,
        comment_id: ID
    ): bool {
        if (!table::contains(&comment_registry.comments_by_post, post_id)) {
            return false
        };
        let comments_bag = table::borrow(&comment_registry.comments_by_post, post_id);
        bag::contains(comments_bag, comment_id)
    }

    /// Kiểm tra xem user đã bookmark post chưa
    public fun is_bookmarked(
        bookmark_registry: &BookmarkRegistry,
        user: address,
        post_id: ID
    ): bool {
        if (!table::contains(&bookmark_registry.bookmarks, user)) {
            return false
        };
        let bookmarks_bag = table::borrow(&bookmark_registry.bookmarks, user);
        bag::contains(bookmarks_bag, post_id)
    }

    /// Lấy pinned post ID của một user
    public fun get_pinned_post_id(profile: &UserProfile): Option<ID> {
        profile.pinned_post_id
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
