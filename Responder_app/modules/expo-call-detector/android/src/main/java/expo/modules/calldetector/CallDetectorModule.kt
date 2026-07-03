package expo.modules.calldetector

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager
import android.telephony.SmsManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallDetectorModule : Module(), CustomInCallService.CallListener {
  
  override fun definition() = ModuleDefinition {
    Name("CallDetector")

    Events("onCallAdded", "onCallRemoved", "onCallStateChanged")

    OnCreate {
      CustomInCallService.listener = this@CallDetectorModule
    }

    OnDestroy {
      if (CustomInCallService.listener == this@CallDetectorModule) {
        CustomInCallService.listener = null
      }
    }

    Function("answerCall") {
      CustomInCallService.answerCall()
    }

    Function("rejectCall") {
      CustomInCallService.rejectCall()
    }

    Function("disconnectCall") {
      CustomInCallService.disconnectCall()
    }

    Function("getCurrentCallPhoneNumber") {
      return@Function CustomInCallService.getCurrentCallPhoneNumber()
    }

    Function("sendSms") { phoneNumber: String, message: String ->
      try {
        val context = appContext.reactContext ?: return@Function "Context is null"
        val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          context.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }
        smsManager.sendTextMessage(phoneNumber, null, message, null, null)
        return@Function "SUCCESS"
      } catch (e: Exception) {
        e.printStackTrace()
        return@Function e.toString()
      }
    }

    Function("isDefaultDialer") {
      val context = appContext.reactContext ?: return@Function false
      val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
      return@Function telecomManager.defaultDialerPackage == context.packageName
    }

    Function("requestDefaultDialer") {
      val activity = appContext.currentActivity ?: return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = activity.getSystemService(Context.ROLE_SERVICE) as RoleManager
        if (roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
          if (!roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
            val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
            activity.startActivityForResult(intent, 123)
            return@Function true
          }
        }
      } else {
        val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
          putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, activity.packageName)
        }
        activity.startActivity(intent)
        return@Function true
      }
      return@Function false
    }
  }

  override fun onCallAdded(phoneNumber: String) {
    sendEvent("onCallAdded", mapOf("phoneNumber" to phoneNumber))
  }

  override fun onCallRemoved() {
    sendEvent("onCallRemoved")
  }

  override fun onCallStateChanged(state: Int, phoneNumber: String) {
    sendEvent("onCallStateChanged", mapOf("state" to state, "phoneNumber" to phoneNumber))
  }
}
