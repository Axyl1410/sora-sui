#[test_only]
module blog::blog_tests {
    use blog::blog;
    use sui::test_scenario::{Self as test_scenario, Scenario};
    use sui::clock::{Self as clock, Clock};
    use sui::transfer;
    use std::string;

    const ADMIN: address = @0x1;
    const USER1: address = @0x2;

    // === Test Helper Functions ===
    fun setup_test_scenario(): Scenario {
        let mut scenario = test_scenario::begin(ADMIN);
        blog::init_for_testing(test_scenario::ctx(&mut scenario));
        // Init function is called automatically, advance to next tx to access shared objects
        test_scenario::next_tx(&mut scenario, ADMIN);
        scenario
    }


    // === Test View Functions ===
    #[test]
    fun test_author_has_posts_false() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Initially no posts
        assert!(!blog::author_has_posts(&post_registry, USER1), 0);
        
        test_scenario::return_shared(post_registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_get_author_post_count_zero() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Initially count is 0
        assert!(blog::get_author_post_count(&post_registry, USER1) == 0, 0);
        
        test_scenario::return_shared(post_registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_is_author_false() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Initially not an author
        assert!(!blog::is_author(&post_registry, USER1), 0);
        
        test_scenario::return_shared(post_registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_get_total_authors_count() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Should always return 0 (placeholder)
        assert!(blog::get_total_authors_count(&post_registry) == 0, 0);
        
        test_scenario::return_shared(post_registry);
        test_scenario::end(scenario);
    }

    // === Test create_profile ===
    #[test]
    fun test_create_profile_success() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let mut profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        blog::create_profile(
            &mut profile_registry,
            string::utf8(b"Alice"),
            string::utf8(b"Developer"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Verify profile was created
        assert!(blog::has_profile(&profile_registry, USER1), 0);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_create_profile_name_too_short() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let mut profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        blog::create_profile(
            &mut profile_registry,
            string::utf8(b"AB"), // Too short
            string::utf8(b""),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 12)]
    fun test_create_profile_name_only_whitespace() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let mut profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        blog::create_profile(
            &mut profile_registry,
            string::utf8(b"   "), // Only spaces
            string::utf8(b""),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }

    // === Test create_post ===
    #[test]
    fun test_create_post_success() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let mut profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        let mut post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        // Create profile first
        blog::create_profile(
            &mut profile_registry,
            string::utf8(b"Alice"),
            string::utf8(b"Bio"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Create post
        blog::create_post(
            &profile_registry,
            &mut post_registry,
            string::utf8(b"My First Post"),
            string::utf8(b"This is the content"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Verify post count
        assert!(blog::get_author_post_count(&post_registry, USER1) == 1, 0);
        assert!(blog::author_has_posts(&post_registry, USER1), 1);
        assert!(blog::is_author(&post_registry, USER1), 2);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(post_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 9)]
    fun test_create_post_without_profile() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        let mut post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        // Try to create post without profile
        blog::create_post(
            &profile_registry,
            &mut post_registry,
            string::utf8(b"Title"),
            string::utf8(b"Content"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(post_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }

    // === Test multiple posts ===
    #[test]
    fun test_multiple_posts_same_author() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let mut profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        let mut post_registry = test_scenario::take_shared<blog::PostRegistry>(&scenario);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        // Create profile
        blog::create_profile(
            &mut profile_registry,
            string::utf8(b"Alice"),
            string::utf8(b"Bio"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Create multiple posts
        blog::create_post(
            &profile_registry,
            &mut post_registry,
            string::utf8(b"Post 1"),
            string::utf8(b"Content 1"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        blog::create_post(
            &profile_registry,
            &mut post_registry,
            string::utf8(b"Post 2"),
            string::utf8(b"Content 2"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        blog::create_post(
            &profile_registry,
            &mut post_registry,
            string::utf8(b"Post 3"),
            string::utf8(b"Content 3"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Verify count
        assert!(blog::get_author_post_count(&post_registry, USER1) == 3, 0);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(post_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }

    // === Test has_profile ===
    #[test]
    fun test_has_profile() {
        let mut scenario = setup_test_scenario();
        test_scenario::next_tx(&mut scenario, USER1);
        let mut profile_registry = test_scenario::take_shared<blog::ProfileRegistry>(&scenario);
        
        // Initially no profile
        assert!(!blog::has_profile(&profile_registry, USER1), 0);
        
        // Create and share Clock
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::share_for_testing(clock);
        test_scenario::next_tx(&mut scenario, USER1);
        let clock = test_scenario::take_shared<Clock>(&scenario);
        
        // Create profile
        blog::create_profile(
            &mut profile_registry,
            string::utf8(b"Alice"),
            string::utf8(b"Bio"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Now has profile
        assert!(blog::has_profile(&profile_registry, USER1), 1);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(clock);
        test_scenario::end(scenario);
    }
}
