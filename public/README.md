# نظام إدارة مركز الصيانة
## Maintenance Center Management System

### 📋 متطلبات النظام

- PHP 7.4 أو أحدث
- MySQL 5.7 أو أحدث (أو MariaDB 10.3+)
- إضافات PHP المطلوبة:
  - PDO
  - PDO MySQL
  - JSON
  - mbstring

### 🚀 خطوات التنصيب

1. **ارفع الملفات** إلى مجلد `public_html` أو `htdocs` على الاستضافة

2. **افتح المتصفح** واذهب إلى:
   ```
   https://yourdomain.com/install.php
   ```

3. **اتبع خطوات المعالج**:
   - التحقق من المتطلبات
   - إدخال بيانات قاعدة البيانات
   - إنشاء الجداول
   - إنشاء حساب المدير
   - إعدادات المركز

4. **احذف ملف التنصيب** بعد الانتهاء:
   ```
   rm install.php
   ```

5. **سجل الدخول** عبر:
   ```
   https://yourdomain.com/
   ```

### 📁 هيكل الملفات

```
/
├── index.html          # الواجهة الأمامية (React)
├── install.php         # معالج التنصيب (احذفه بعد التنصيب)
├── .htaccess           # إعدادات Apache
├── api/
│   ├── config.php      # إعدادات قاعدة البيانات (يُنشأ تلقائياً)
│   ├── db.php          # الاتصال بقاعدة البيانات
│   ├── auth.php        # تسجيل الدخول والخروج
│   ├── users.php       # إدارة المستخدمين
│   ├── orders.php      # أوامر الصيانة
│   ├── customers.php   # العملاء
│   ├── spare-parts.php # قطع الغيار
│   ├── transactions.php# المعاملات المالية
│   └── settings.php    # الإعدادات والعملات
└── assets/             # ملفات CSS و JS
```

### 🔒 الأمان

- كلمات المرور مُشفرة بـ bcrypt
- حماية CSRF
- SQL Injection Protection (PDO Prepared Statements)
- XSS Protection Headers
- ملف config.php محمي من الوصول المباشر

### 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth.php?action=login` | POST | تسجيل الدخول |
| `/api/auth.php?action=logout` | GET | تسجيل الخروج |
| `/api/users.php` | GET/POST | قائمة/إضافة المستخدمين |
| `/api/users.php?id=xxx` | GET/PUT/DELETE | مستخدم محدد |
| `/api/orders.php` | GET/POST | الأوامر |
| `/api/customers.php` | GET/POST | العملاء |
| `/api/spare-parts.php` | GET/POST | قطع الغيار |
| `/api/transactions.php` | GET/POST | المعاملات |
| `/api/settings.php` | GET/POST | الإعدادات |

### 💾 النسخ الاحتياطي

من داخل النظام:
1. اذهب إلى **الإعدادات** > **النظام**
2. اضغط **تحميل نسخة احتياطية**
3. احفظ الملف JSON

للاستعادة:
1. اذهب إلى **الإعدادات** > **النظام**
2. اضغط **استعادة من نسخة احتياطية**
3. اختر ملف JSON

### 📞 الدعم

للمساعدة أو الاستفسارات، تواصل معنا.

---

**الإصدار:** 2.0.0  
**الترخيص:** MIT
