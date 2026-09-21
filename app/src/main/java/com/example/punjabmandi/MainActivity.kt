package com.example.punjabmandi

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.example.punjabmandi.ui.MandiApp
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.PunjabMandiTheme

class MainActivity : ComponentActivity() {
    private val viewModel: MandiViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PunjabMandiTheme {
                MandiApp(viewModel = viewModel)
            }
        }
    }
}
