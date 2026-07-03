package expo.modules.calldetector

import android.telecom.Call
import android.telecom.InCallService
import android.util.Log

class CustomInCallService : InCallService() {

    companion object {
        private const val TAG = "CustomInCallService"
        var currentCall: Call? = null
        var listener: CallListener? = null

        fun answerCall() {
            currentCall?.answer(0)
        }

        fun rejectCall() {
            currentCall?.reject(false, null)
        }

        fun disconnectCall() {
            currentCall?.disconnect()
        }

        fun getCurrentCallPhoneNumber(): String? {
            return currentCall?.details?.handle?.schemeSpecificPart
        }
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        Log.d(TAG, "onCallAdded: $call")
        currentCall = call
        
        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                super.onStateChanged(call, state)
                Log.d(TAG, "Call state changed to $state")
                listener?.onCallStateChanged(state, getPhoneNumber(call))
            }
        })

        // Force launch the app to the foreground
        try {
            val intent = android.content.Intent(this, Class.forName("com.palobog.mobile.MainActivity"))
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch MainActivity", e)
        }

        listener?.onCallAdded(getPhoneNumber(call))
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.d(TAG, "onCallRemoved: $call")
        if (currentCall == call) {
            currentCall = null
        }
        listener?.onCallRemoved()
    }

    private fun getPhoneNumber(call: Call): String {
        return call.details?.handle?.schemeSpecificPart ?: "Unknown"
    }

    interface CallListener {
        fun onCallAdded(phoneNumber: String)
        fun onCallRemoved()
        fun onCallStateChanged(state: Int, phoneNumber: String)
    }
}
