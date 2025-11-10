import mysql from 'serverless-mysql';

// إنشاء اتصال قاعدة البيانات
const db = mysql({
  config: {
    host: process.env.DB_HOST || 'sql203.infinityfree.com',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'if0_40255653_esp32',
    user: process.env.DB_USER || 'if0_40255653',
    password: process.env.DB_PASSWORD || 'vpA4n68qfseBYWV'
  }
});

export default async function handler(req, res) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // معالجة OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // السماح فقط بـ POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    // استخراج البيانات
    const { led, status } = req.body;
    
    console.log('📥 طلب تحديث:', { led, status });
    
    // التحقق من البيانات
    if (!led || !status) {
      return res.status(400).json({
        success: false,
        message: 'بيانات مفقودة - يجب إرسال led و status',
        received: { led, status }
      });
    }
    
    const ledNumber = parseInt(led);
    const ledStatus = status.toUpperCase();
    
    // التحقق من صحة القيم
    if (![1, 2].includes(ledNumber)) {
      return res.status(400).json({
        success: false,
        message: 'رقم LED غير صحيح - يجب أن يكون 1 أو 2',
        received: ledNumber
      });
    }
    
    if (!['ON', 'OFF'].includes(ledStatus)) {
      return res.status(400).json({
        success: false,
        message: 'حالة LED غير صحيحة - يجب أن تكون ON أو OFF',
        received: ledStatus
      });
    }
    
    console.log('🔍 جاري تحديث قاعدة البيانات...');
    
    // تحديث قاعدة البيانات
    const result = await db.query(
      'UPDATE led_control SET status = ? WHERE id = ?',
      [ledStatus, ledNumber]
    );
    
    // إغلاق الاتصال
    await db.end();
    
    console.log('✅ نتيجة التحديث:', result);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `لم يتم العثور على LED رقم ${ledNumber}`
      });
    }
    
    // إرجاع استجابة ناجحة
    return res.status(200).json({
      success: true,
      message: 'تم التحديث بنجاح',
      led: ledNumber,
      status: ledStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ خطأ في التحديث:', error);
    
    // إغلاق الاتصال في حالة الخطأ
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

