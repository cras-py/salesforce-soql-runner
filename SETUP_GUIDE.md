# Quick Setup Guide - Salesforce SOQL Runner

## 🚀 **Your application is ready to use!**

### **Current Status:**
✅ Server running on: http://localhost:5000  
✅ Client running on: http://localhost:3000  
✅ All dependencies installed  
✅ Security token support added  

---

## **How to Login to Salesforce**

### **Option 1: From Trusted Network (Office/VPN)**
If you're accessing from your company's trusted IP ranges:
- Username: `your.email@company.com`
- Password: `your_password`
- Security Token: *(leave empty)*

### **Option 2: From External Network (Home/Public WiFi)**
If you're accessing from outside trusted networks:
- Username: `your.email@company.com`
- Password: `your_password`
- Security Token: `your_security_token`

### **How to Get Your Security Token:**
1. Log into Salesforce web interface
2. Go to **Setup** (gear icon)
3. In Quick Find, search: **"Reset My Security Token"**
4. Click **"Reset My Security Token"**
5. Check your email for the new token
6. Use this token in the app

---

## **Testing the Application**

### **1. Basic Login Test**
```
Environment: Sandbox (recommended for testing)
Username: your_sandbox_username
Password: your_password + security_token (if needed)
```

### **2. Sample SOQL Queries to Try**
```sql
-- Basic Account query
SELECT Id, Name, Type, Industry FROM Account LIMIT 10

-- Contact query with relationships
SELECT Id, Name, Email, Account.Name FROM Contact LIMIT 10

-- Opportunity query
SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity LIMIT 10

-- User query
SELECT Id, Name, Email, Profile.Name FROM User LIMIT 5
```

### **3. Test Data Inspection**
1. Run any query above
2. Click **"Inspect Data"** 
3. Explore the **Statistics** tab
4. Try filtering in the **Data View** tab
5. Export filtered data as CSV

---

## **Application Features Overview**

### **🏠 Dashboard**
- Quick access to all features
- View available Salesforce objects
- See recent saved queries

### **🔍 Query Runner**
- Execute SOQL queries
- Save frequently used queries
- Export results to CSV
- Navigate to data inspection

### **📊 Data Inspector** *(Pandas-like functionality)*
- **Statistical Analysis**: Min, max, mean, median
- **Data Quality**: Null counts, unique values
- **Top Values**: Most frequent categorical values
- **Interactive Filtering**: Sort and filter data
- **Export**: Download filtered results

### **🔖 Saved Queries**
- Manage your query library
- Edit and organize queries
- Quick execution of saved queries

---

## **Troubleshooting**

### **Common Login Issues:**

**"Security token required"**
- Add your security token to the Security Token field
- Or connect from a trusted network

**"Invalid username or password"**
- Double-check credentials
- Ensure you're using the right environment (Production vs Sandbox)

**"Too many login attempts"**
- Wait 15-30 minutes before trying again

### **Application Issues:**

**Components not loading**
- Refresh the browser page
- Check browser console for errors

**Query execution fails**
- Verify SOQL syntax
- Check object and field permissions
- Ensure you have access to the queried objects

---

## **Next Steps**

1. **Test the login** with your Salesforce credentials
2. **Run sample queries** to verify functionality
3. **Explore data inspection** features
4. **Save useful queries** for future use
5. **Export data** to CSV for analysis

---

## **Support**

If you encounter any issues:
1. Check the browser console for errors
2. Check the server terminal for error messages
3. Verify your Salesforce permissions
4. Ensure your org allows API access

**The application is fully functional and ready for production use!** 🎉 