# Security Features Setup & Testing Guide

## 🚀 Quick Setup

### 1. Install Dependencies (if not already installed)
```bash
cd backend
npm install bcrypt express-validator
```

### 2. Recreate Admin Table with Hashed Password
```bash
cd backend
node create-admin.js
```

Expected output:
```
🔄 Creating admins table...
✅ Admins table structure created
✅ Admins table created successfully!

📝 Default admin credentials:
   Username: admin
   Password: admin

⚠️  IMPORTANT: Change the password after first login!
🔐 Password is securely hashed with bcrypt
```

### 3. Test the Security Implementation
```bash
node test-login.js
```

Expected output:
```
1. Checking admins table structure...
Columns: [
  { column_name: 'id', data_type: 'integer' },
  { column_name: 'username', data_type: 'character varying' },
  { column_name: 'password', data_type: 'character varying' },
  { column_name: 'email', data_type: 'character varying' },
  ...
]

2. Checking admin records...
Admins: [ { id: 1, username: 'admin', email: 'admin@udm.edu.ph', ... } ]

3. Testing login with bcrypt...
✅ Login successful!
   User ID: 1
   Username: admin
```

## 🧪 Testing Checklist

### ✅ Password Hashing Test
1. Open your database tool (pgAdmin, DBeaver, etc.)
2. Run query: `SELECT username, password FROM admins;`
3. Verify password field shows bcrypt hash (starts with `$2b$` or `$2a$`)
4. Confirm it's NOT plain text "admin"

Example hash: `$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`

### ✅ Input Validation Test

#### Test 1: Invalid Username (too short)
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","password":"admin"}'
```

Expected response:
```json
{
  "success": false,
  "message": "Username must be between 3 and 50 characters"
}
```

#### Test 2: Invalid Username (special characters)
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@123","password":"admin"}'
```

Expected response:
```json
{
  "success": false,
  "message": "Username can only contain letters, numbers, hyphens, and underscores"
}
```

#### Test 3: Invalid Password (too short)
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ab"}'
```

Expected response:
```json
{
  "success": false,
  "message": "Password must be at least 3 characters"
}
```

#### Test 4: Valid Credentials
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

Expected response:
```json
{
  "success": true,
  "token": "session_...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator"
  }
}
```

### ✅ Browser Testing

1. **Open the application**: http://localhost:5173 (or your Vite dev port)
2. **Navigate to Admin Login**: Click admin button or go to /login
3. **Test Invalid Inputs**:
   - Try username "ab" → Should show validation error
   - Try password "ab" → Should show validation error
   - Try username with @ symbol → Should show validation error
4. **Test Valid Login**:
   - Username: `admin`
   - Password: `admin`
   - Should successfully log in and redirect to admin dashboard

### ✅ Security Verification Checklist

- [ ] Passwords in database are hashed (not plain text)
- [ ] Login with correct password works
- [ ] Login with incorrect password fails with generic message
- [ ] Short usernames are rejected
- [ ] Special characters in username are rejected
- [ ] Short passwords are rejected
- [ ] Missing username/password returns validation error
- [ ] Localhost bypass works (localhost allows test credentials)
- [ ] Error messages don't expose sensitive information

## 🔍 Common Issues & Solutions

### Issue 1: "bcrypt not found"
**Solution**: Install bcrypt
```bash
cd backend
npm install bcrypt
```

### Issue 2: "express-validator not found"
**Solution**: Install express-validator
```bash
cd backend
npm install express-validator
```

### Issue 3: "Login fails even with correct credentials"
**Cause**: Database still has plain text password
**Solution**: Recreate admin table
```bash
cd backend
node create-admin.js
```

### Issue 4: "Localhost bypass not working"
**Cause**: Frontend not running on localhost
**Solution**: Check VITE_API_URL in .env matches your backend URL

### Issue 5: "Validation middleware not found"
**Cause**: Middleware directory doesn't exist
**Solution**: 
```bash
mkdir backend/middleware
# validation.js should already be created
```

## 📊 Verification SQL Queries

### Check Password Hash Format
```sql
SELECT 
    id,
    username,
    SUBSTRING(password, 1, 7) as hash_prefix,
    LENGTH(password) as hash_length,
    created_at
FROM admins;
```

Expected output:
- `hash_prefix`: Should be `$2b$10$` or `$2a$10$`
- `hash_length`: Should be 60 characters

### Check Audit Log (if enabled)
```sql
SELECT 
    action,
    username,
    status,
    timestamp
FROM audit_log
WHERE action LIKE '%Login%'
ORDER BY timestamp DESC
LIMIT 10;
```

## 🎓 For Capstone Defense

### Demonstrate to Panelists:

1. **Show Database Schema**
   ```sql
   \d admins
   ```
   Point out `password VARCHAR(255)` for storing bcrypt hashes

2. **Show Hashed Password**
   ```sql
   SELECT username, password FROM admins;
   ```
   Explain bcrypt hash structure: `$2b$[cost]$[salt][hash]`

3. **Live Validation Test**
   - Try invalid inputs in browser
   - Show validation error messages
   - Explain how this prevents SQL injection

4. **Code Walkthrough**
   - Show `backend/routes/admin.js` bcrypt.compare()
   - Show `backend/middleware/validation.js` validators
   - Explain security benefits of each

5. **Security Documentation**
   - Present SECURITY_IMPROVEMENTS.md
   - Discuss OWASP Top 10 coverage
   - Mention future enhancements

## 📝 Testing Log Template

Create a testing log for your documentation:

```
Date: _____________
Tester: _____________

Password Hashing:
[ ] Passwords stored as bcrypt hashes: _______
[ ] Login with correct password: _______
[ ] Login with incorrect password: _______

Input Validation:
[ ] Short username rejected: _______
[ ] Invalid characters rejected: _______
[ ] Short password rejected: _______
[ ] Valid inputs accepted: _______

Security:
[ ] No plain text passwords in database: _______
[ ] Error messages generic (no info leakage): _______
[ ] Localhost bypass working: _______
[ ] Production security maintained: _______

Notes:
_________________________________
_________________________________
```

## 🚀 Next Steps

After verifying security features:
1. ✅ Test thoroughly in localhost
2. Update environment variables for production
3. Deploy to Render/Vercel
4. Verify production authentication
5. Document testing results for capstone defense
6. Consider additional security enhancements (rate limiting, etc.)

---

**Important**: Always test in localhost first before deploying to production!
