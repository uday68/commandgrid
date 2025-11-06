# Meeting Creation API Test

## Test the Fixed Meeting Creation

### Using Postman or cURL:

**Endpoint:** `POST /api/meetings`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "title": "Test Meeting After Fix",
  "description": "Testing the admin/user foreign key fix",
  "meeting_date": "2025-06-16",
  "meeting_time": "14:30",
  "agenda": "Test agenda to verify the fix works",
  "meeting_context": "company"
}
```

### Expected Results:
✅ **Success Response (201):**
```json
{
  "message": "Meeting created successfully",
  "data": {
    "meeting_id": "uuid-here",
    "title": "Test Meeting After Fix",
    "meeting_date": "2025-06-16",
    "meeting_time": "14:30:00",
    "created_by": "your-user-or-admin-id",
    // ... other fields
  }
}
```

### What Should Work Now:
1. ✅ Admin users can create meetings
2. ✅ User users can create meetings  
3. ✅ Automatic reminders are created
4. ✅ Meeting participants can be added
5. ✅ No foreign key constraint errors

### If You Still Get Errors:
- Check that the backend server was restarted after the fixes
- Verify that the JWT token contains a valid user_id or admin_id
- Check the backend logs for any remaining issues

## Quick Manual Test

You can also run this quick test to verify everything is working:

```bash
cd D:\project_management_tool\backend
node final_test.js
```

This will create a test meeting with an admin user and verify all functionality works correctly.
