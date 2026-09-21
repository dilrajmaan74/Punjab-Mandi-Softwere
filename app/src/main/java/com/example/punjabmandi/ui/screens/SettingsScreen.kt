package com.example.punjabmandi.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*

@Composable
fun SettingsScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val settings by viewModel.settings.collectAsState()

    var firmNameEn by remember { mutableStateOf(settings.firmNameEn) }
    var firmNamePa by remember { mutableStateOf(settings.firmNamePa) }
    var mandiNameEn by remember { mutableStateOf(settings.mandiNameEn) }
    var mandiNamePa by remember { mutableStateOf(settings.mandiNamePa) }
    var marketCommitteePa by remember { mutableStateOf(settings.marketCommitteePa) }
    var firmMobile by remember { mutableStateOf(settings.firmMobile) }
    var fixedRateInput by remember { mutableStateOf("${settings.fixedRatePerQtl.toInt()}") }
    var bagWeightInput by remember { mutableStateOf("${settings.fixedBagWeightKg}") }
    var pakkiRateInput by remember { mutableStateOf("${settings.defaultPakkiLabourRate.toInt()}") }
    var doubleRateInput by remember { mutableStateOf("${settings.defaultPakkaDoubleLabourRate.toInt()}") }
    var sukhiRateInput by remember { mutableStateOf("${settings.defaultSukhiLabourRate.toInt()}") }

    var saveMessage by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("settings_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column {
                Text(
                    text = if (isPa) "ਮੰਡੀ ਤੇ ਫਰਮ ਸੈਟਿੰਗਾਂ (Mandi Settings)" else "Mandi & Firm Settings",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (isPa) "ਆੜ੍ਹਤੀਆ ਫਰਮ, ਮੰਡੀ ਦਰਾਂ, ਬੋਰੀ ਭਾਰ ਅਤੇ ਲੇਬਰ ਰੇਟ" else "Configure Mandi rates, firm name & default labour rates",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted
                )
            }
        }

        if (saveMessage) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle)) {
                    Text(
                        text = if (isPa) "ਸੈਟਿੰਗਾਂ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈਆਂ ਹਨ!" else "Settings saved successfully!",
                        color = MandiGreenDark,
                        modifier = Modifier.padding(12.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Firm Information Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(if (isPa) "ਫਰਮ ਤੇ ਆੜ੍ਹਤ ਵੇਰਵੇ" else "Commission Agent Firm Details", fontWeight = FontWeight.Bold)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = firmNameEn,
                            onValueChange = { firmNameEn = it },
                            label = { Text("Firm Name (En)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = firmNamePa,
                            onValueChange = { firmNamePa = it },
                            label = { Text("ਫਰਮ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ)") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = mandiNamePa,
                            onValueChange = { mandiNamePa = it },
                            label = { Text("ਦਾਣਾ ਮੰਡੀ ਦਾ ਨਾਮ") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = marketCommitteePa,
                            onValueChange = { marketCommitteePa = it },
                            label = { Text("ਮਾਰਕੀਟ ਕਮੇਟੀ") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = firmMobile,
                        onValueChange = { firmMobile = it },
                        label = { Text("ਫੋਨ ਨੰਬਰ (Mobile)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Rates Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(if (isPa) "ਭਾਅ ਅਤੇ ਵਜ਼ਨ ਸੈਟਿੰਗਾਂ" else "Crop Rate & Bag Weight", fontWeight = FontWeight.Bold)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = fixedRateInput,
                            onValueChange = { fixedRateInput = it },
                            label = { Text("ਸਰਕਾਰੀ ਭਾਅ (₹/ਕੁਇੰਟਲ)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = bagWeightInput,
                            onValueChange = { bagWeightInput = it },
                            label = { Text("ਬੋਰੀ ਦਾ ਭਾਰ (KG)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // Labour Rates Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(if (isPa) "ਡਿਫਾਲਟ ਲੇਬਰ ਰੇਟ (ਪ੍ਰਤੀ ਬੋਰੀ)" else "Default Labour Rates (Per Bag)", fontWeight = FontWeight.Bold)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = pakkiRateInput,
                            onValueChange = { pakkiRateInput = it },
                            label = { Text("ਪੱਕੀ (₹)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = doubleRateInput,
                            onValueChange = { doubleRateInput = it },
                            label = { Text("ਡਬਲ (₹)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = sukhiRateInput,
                            onValueChange = { sukhiRateInput = it },
                            label = { Text("ਸੁੱਕੀ (₹)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        item {
            Button(
                onClick = {
                    val rate = fixedRateInput.toDoubleOrNull() ?: 2461.0
                    val weight = bagWeightInput.toDoubleOrNull() ?: 37.50
                    val pakki = pakkiRateInput.toDoubleOrNull() ?: 8.0
                    val dbl = doubleRateInput.toDoubleOrNull() ?: 14.0
                    val sukhi = sukhiRateInput.toDoubleOrNull() ?: 5.0

                    viewModel.updateSettings(
                        settings.copy(
                            firmNameEn = firmNameEn,
                            firmNamePa = firmNamePa,
                            mandiNameEn = mandiNameEn,
                            mandiNamePa = mandiNamePa,
                            marketCommitteePa = marketCommitteePa,
                            firmMobile = firmMobile,
                            fixedRatePerQtl = rate,
                            fixedBagWeightKg = weight,
                            defaultPakkiLabourRate = pakki,
                            defaultPakkaDoubleLabourRate = dbl,
                            defaultSukhiLabourRate = sukhi
                        )
                    )
                    saveMessage = true
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (isPa) "ਸੈਟਿੰਗਾਂ ਸੇਵ ਕਰੋ" else "Save Settings")
            }
        }
    }
}
