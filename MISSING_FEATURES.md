# Các chức năng còn thiếu trong Frontend

Sau khi kiểm tra contract `blog.move` và so sánh với frontend, các chức năng sau chưa được tích hợp:

## 1. ❌ Comments System (Hệ thống bình luận)

### Contract Functions:
- ✅ `create_comment` - Đã có hook `useCreateComment`
- ❌ `update_comment` - Chưa có hook
- ❌ `delete_comment` - Chưa có hook

### Frontend Status:
- ❌ Không có UI để hiển thị danh sách comments
- ❌ Không có hook để query comments (`useComments`)
- ❌ Không có component để hiển thị comment (`CommentCard`, `CommentList`)
- ❌ Không có UI để edit/delete comment
- ⚠️ Trong `post.$id.tsx` có placeholder "Comments feature coming soon..."

### Cần thêm:
1. Hook `useComments(postId)` để query comments từ events
2. Hook `useUpdateComment()` để update comment
3. Hook `useDeleteComment()` để delete comment
4. Component `CommentList` để hiển thị danh sách comments
5. Component `CommentCard` để hiển thị từng comment
6. Component `CommentForm` để tạo/edit comment
7. Tích hợp vào `post.$id.tsx` để hiển thị comments

---

## 2. ❌ Bookmarks List (Danh sách bookmarks)

### Contract Functions:
- ✅ `bookmark_post` - Đã có hook `useBookmarkPost`
- ✅ `unbookmark_post` - Đã có hook `useUnbookmarkPost`
- ✅ `is_bookmarked` - Có thể query qua events

### Frontend Status:
- ✅ Có nút bookmark trong `PostCard`
- ❌ Không có trang/UI để hiển thị danh sách bookmarks của user
- ❌ Không có hook để query bookmarks (`useBookmarks`)

### Cần thêm:
1. Hook `useBookmarks(userAddress)` để query bookmarked posts từ events
2. Route `/bookmarks` hoặc tab "Bookmarks" trong profile
3. Component để hiển thị danh sách bookmarks

---

## 3. ❌ Pinned Post (Post được pin)

### Contract Functions:
- ✅ `pin_post` - Đã có hook `usePinPost`
- ✅ `unpin_post` - Đã có hook `useUnpinPost`
- ✅ `get_pinned_post_id` - Có thể lấy từ profile object

### Frontend Status:
- ✅ Có field `pinnedPostId` trong Profile type
- ❌ Không có UI để hiển thị pinned post trong profile
- ❌ Không có UI để pin/unpin post
- ❌ Không có hook để query pinned post

### Cần thêm:
1. Hook `usePinnedPost(profileId)` để query pinned post
2. Hiển thị pinned post ở đầu danh sách posts trong profile page
3. Nút "Pin" trong post detail page (chỉ hiện cho owner)
4. Badge/indicator để đánh dấu post đã được pin

---

## 4. ❌ Delete Profile (Xóa profile)

### Contract Functions:
- ❌ `delete_profile` - Chưa có hook

### Frontend Status:
- ❌ Không có UI để xóa profile
- ❌ Không có hook `useDeleteProfile`

### Cần thêm:
1. Hook `useDeleteProfile()` để delete profile
2. Nút "Delete Profile" trong profile settings/edit dialog
3. Confirmation dialog trước khi xóa

---

## 5. ⚠️ Profile Tabs (Các tab trong profile)

### Contract Functions:
- ✅ Có thể query posts, likes, bookmarks

### Frontend Status:
- ✅ Tab "Posts" - Đã có
- ❌ Tab "Posts & replies" - Disabled (cần query comments của user)
- ❌ Tab "Media" - Disabled (cần query posts có media)
- ❌ Tab "Likes" - Disabled (cần query liked posts)

### Cần thêm:
1. Hook `useLikedPosts(userAddress)` để query posts đã like
2. Hook `useUserComments(userAddress)` để query comments của user
3. Implement các tabs còn lại

---

## Tóm tắt Priority:

### High Priority (Quan trọng):
1. **Comments System** - Core feature, đã có hook create nhưng thiếu UI và update/delete
2. **Pinned Post** - Đã có hooks, chỉ cần UI

### Medium Priority:
3. **Bookmarks List** - Đã có hooks, chỉ cần trang hiển thị
4. **Delete Profile** - Cần hook và UI

### Low Priority:
5. **Profile Tabs** - Nice to have, có thể làm sau

---

## Ghi chú:

- Tất cả các entry functions trong contract đều đã được implement hooks (trừ `delete_profile`, `update_comment`, `delete_comment`)
- Các view functions không cần thiết vì đã parse data từ objects
- Cần query events để lấy danh sách comments, bookmarks, liked posts

