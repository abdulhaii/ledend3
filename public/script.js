// ============================================
// متغيرات عامة
// ============================================
let currentStatus = {
    led1: 'OFF',
    led2: 'OFF'
};

let isUpdating = false;
let updateInterval;

// ============================================
// دوال التحكم بواجهة المستخدم
// ============================================

// تحديث حالة LED في الواجهة
function updateUIStatus(ledNumber, status) {
    const statusElement = document.getElementById(`led${ledNumber}-status`);
    const cardElement = document.getElementById(`led${ledNumber}-card`);
    
    if (status === 'ON') {
        statusElement.textContent = '🟢 مضاء';
        statusElement.className = 'status-badge status-on';
    } else {
        statusElement.textContent = '🔴 مطفأ';
        statusElement.className = 'status-badge status-off';
    }
    
    // إضافة تأثير التغيير
    statusElement.classList.add('status-change');
    setTimeout(() => {
        statusElement.classList.remove('status-change');
    }, 500);
}

// تحديث حالة الاتصال
function updateConnectionStatus(status, message) {
    const connectionElement = document.getElementById('connection-status');
    
    switch(status) {
        case 'connected':
            connectionElement.textContent = '🟢 متصل';
            connectionElement.className = 'connected';
            break;
        case 'disconnected':
            connectionElement.textContent = '🔴 غير متصل';
            connectionElement.className = 'disconnected';
            break;
        case 'connecting':
            connectionElement.textContent = '🔄 جاري الاتصال...';
            connectionElement.className = 'connecting';
            break;
        default:
            connectionElement.textContent = message || '❓ حالة غير معروفة';
            connectionElement.className = '';
    }
}

// تحديث وقت آخر تحديث
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('last-update').textContent = timeString;
}

// إظهار/إخفاء شاشة التحميل
function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// تعطيل/تفعيل الأزرار
function toggleButtons(disabled = false) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = disabled;
    });
}

// ============================================
// دوال API
// ============================================

// جلب حالة LED من الخادم
async function fetchLEDStatus() {
    try {
        updateConnectionStatus('connecting');
        
        const response = await fetch('/api/get-status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // تحديث الحالة المحلية
            currentStatus.led1 = data.led1;
            currentStatus.led2 = data.led2;
            
            // تحديث الواجهة
            updateUIStatus(1, data.led1);
            updateUIStatus(2, data.led2);
            updateConnectionStatus('connected');
            updateLastUpdateTime();
            
            console.log('✅ تم جلب البيانات بنجاح:', data);
        } else {
            throw new Error(data.message || 'فشل في جلب البيانات');
        }
        
    } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
        updateConnectionStatus('disconnected', '❌ خطأ في الاتصال');
    }
}

// تحديث حالة LED
async function updateLED(ledNumber, status) {
    if (isUpdating) {
        console.log('⚠️ جاري التحديث، يرجى الانتظار...');
        return;
    }
    
    isUpdating = true;
    showLoading(true);
    toggleButtons(true);
    
    try {
        console.log(`📤 إرسال تحديث: LED ${ledNumber} -> ${status}`);
        
        const response = await fetch('/api/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                led: ledNumber,
                status: status
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // تحديث الحالة المحلية
            currentStatus[`led${ledNumber}`] = status;
            
            // تحديث الواجهة
            updateUIStatus(ledNumber, status);
            updateLastUpdateTime();
            
            console.log('✅ تم التحديث بنجاح:', data);
            
            // جلب الحالة المحدثة بعد ثانية واحدة
            setTimeout(fetchLEDStatus, 1000);
            
        } else {
            throw new Error(data.message || 'فشل في التحديث');
        }
        
    } catch (error) {
        console.error('❌ خطأ في التحديث:', error);
        alert(`خطأ في التحديث: ${error.message}`);
        
    } finally {
        isUpdating = false;
        showLoading(false);
        toggleButtons(false);
    }
}

// ============================================
// دوال التهيئة والأحداث
// ============================================

// بدء التحديث التلقائي
function startAutoUpdate() {
    // جلب البيانات فوراً
    fetchLEDStatus();
    
    // تعيين التحديث التلقائي كل 3 ثواني
    updateInterval = setInterval(fetchLEDStatus, 3000);
    
    console.log('🔄 تم تشغيل التحديث التلقائي (كل 3 ثواني)');
}

// إيقاف التحديث التلقائي
function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('⏹️ تم إيقاف التحديث التلقائي');
    }
}

// معالج أحداث النافذة
function handleVisibilityChange() {
    if (document.hidden) {
        stopAutoUpdate();
        console.log('📱 التبويب غير مرئي - إيقاف التحديث');
    } else {
        startAutoUpdate();
        console.log('📱 التبويب مرئي - تشغيل التحديث');
    }
}

// معالج أحداث الاتصال
function handleOnline() {
    console.log('🌐 عاد الاتصال بالإنترنت');
    updateConnectionStatus('connecting', '🔄 إعادة الاتصال...');
    startAutoUpdate();
}

function handleOffline() {
    console.log('📵 انقطع الاتصال بالإنترنت');
    updateConnectionStatus('disconnected', '📵 لا يوجد اتصال بالإنترنت');
    stopAutoUpdate();
}

// ============================================
// تهيئة التطبيق
// ============================================

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل التطبيق');
    
    // بدء التحديث التلقائي
    startAutoUpdate();
    
    // إضافة مستمعي الأحداث
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // إضافة معالج إغلاق النافذة
    window.addEventListener('beforeunload', function() {
        stopAutoUpdate();
    });
    
    console.log('✅ تم تهيئة التطبيق بنجاح');
});

// ============================================
// دوال مساعدة للتطوير
// ============================================

// تصدير دوال للاستخدام في console المتصفح
window.ledControl = {
    updateLED,
    fetchLEDStatus,
    startAutoUpdate,
    stopAutoUpdate,
    getCurrentStatus: () => currentStatus
};

console.log('🔧 دوال التحكم متاحة في window.ledControl');