package com.gatewaytofuture.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Hardware back-button events are dispatched by BridgeActivity directly
        // to Capacitor's AppPlugin (`App.addListener("backButton")`) in CapacitorBridge.tsx.
    }
}
