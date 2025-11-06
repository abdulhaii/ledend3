import mysql from 'serverless-mysql';

// إنشاء اتصال قاعدة البيانات
const db = mysql({
  config: {
    host: process.env.DB_HOST || 'sql8.freesqldatabase.com',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'sql8805485',
    user: process.env.DB_USER || 'sql8805485',
    password: process.env.DB_PASSWORD || 'wpfm3nSAaM'
  }
});

export default async function handler(req, res) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // معالجة OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // السماح فقط بـ GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    console.log('🔍 جاري الاتصال بقاعدة البيانات...');
    
    // جلب البيانات
    const results = await db.query(
      'SELECT id, status FROM led_control ORDER BY id'
    );
    
    // إغلاق الاتصال (مهم جداً في Serverless)
    await db.end();
    
    console.log('✅ تم جلب البيانات:', results);
    
    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات',
        timestamp: new Date().toISOString()
      });
    }
    
    // تنسيق البيانات
    const response = {
      success: true,
      timestamp: new Date().toISOString()
    };
    
    results.forEach(row => {
      response[`led${row.id}`] = row.status;
    });
    
    console.log('📤 إرسال الاستجابة:', response);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ خطأ في قاعدة البيانات:', error);
    
    // إغلاق الاتصال في حالة الخطأ أيضاً
    try {
      await db.end();
    } catch (e) {
      console.error('خطأ في إغلاق الاتصال:', e);
    }
    
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
