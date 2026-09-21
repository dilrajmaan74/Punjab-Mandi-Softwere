package com.example.punjabmandi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.punjabmandi.model.DailyPurchaseRecord
import com.example.punjabmandi.model.Farmer
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations
import java.util.UUID

val AGENCIES = listOf("Markfed", "Pungrain", "PUNSUP", "PSWC", "FCI", "Trader / Private")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyPurchaseScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val farmers by viewModel.farmers.collectAsState()
    val purchases by viewModel.purchases.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var showForm by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Form inputs
    var selectedAgency by remember { mutableStateOf(AGENCIES[0]) }
    var agencyDropdownExpanded by remember { mutableStateOf(false) }

    var selectedFarmer by remember { mutableStateOf<Farmer?>(null) }
    var farmerSearchQuery by remember { mutableStateOf("") }
    var showFarmerDropdown by remember { mutableStateOf(false) }

    var bagsInput by remember { mutableStateOf("") }
    val bagsToPurchase = bagsInput.toIntOrNull() ?: 0

    val remainingBagsForSelected = selectedFarmer?.let { viewModel.getRemainingBagsForFarmer(it.id) } ?: 0
    val weightBreakdown = Calculations.calculateBagsWeight(bagsToPurchase, settings.fixedBagWeightKg)
    val totalAmount = Calculations.calculatePayableAmount(weightBreakdown.totalKg, settings.fixedRatePerQtl)

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("daily_purchase_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = if (isPa) "ਰੋਜ਼ਾਨਾ ਏਜੰਸੀ ਖਰੀਦ (Agency Purchase)" else "Agency Purchase Register",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isPa) "ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ: ਮਾਰਕਫੈੱਡ, ਪਨਗ੍ਰੇਨ, ਪਨਸਪ, ਵੇਅਰਹਾਊਸ, ਐੱਫ.ਸੀ.ਆਈ" else "Markfed, Pungrain, PUNSUP, PSWC, FCI",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = {
                        showForm = !showForm
                        errorMessage = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WheatGold),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("toggle_new_purchase_form")
                ) {
                    Icon(if (showForm) Icons.Default.Close else Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (showForm) (if (isPa) "ਬੰਦ ਕਰੋ" else "Close") else (if (isPa) "ਨਵੀਂ ਖਰੀਦ" else "Add Purchase"))
                }
            }
        }

        if (showForm) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = if (isPa) "ਏਜੰਸੀ ਖਰੀਦ ਐਂਟਰੀ (Date: ${Calculations.getTodayDDMMYYYY()})" else "Agency Purchase Entry (${Calculations.getTodayDDMMYYYY()})",
                            fontWeight = FontWeight.Bold,
                            color = MandiGreenDark,
                            style = MaterialTheme.typography.titleSmall
                        )

                        errorMessage?.let { msg ->
                            Text(
                                text = msg,
                                color = DangerRed,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(DangerSubtle, RoundedCornerShape(6.dp))
                                    .padding(8.dp)
                            )
                        }

                        // Agency Selector
                        Box {
                            OutlinedTextField(
                                value = selectedAgency,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text(if (isPa) "ਖਰੀਦ ਏਜੰਸੀ" else "Procurement Agency") },
                                modifier = Modifier.fillMaxWidth(),
                                trailingIcon = {
                                    IconButton(onClick = { agencyDropdownExpanded = true }) {
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                    }
                                }
                            )
                            DropdownMenu(
                                expanded = agencyDropdownExpanded,
                                onDismissRequest = { agencyDropdownExpanded = false }
                            ) {
                                AGENCIES.forEach { agency ->
                                    DropdownMenuItem(
                                        text = { Text(agency) },
                                        onClick = {
                                            selectedAgency = agency
                                            agencyDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // Farmer Selector with live remaining bags badge
                        Column {
                            OutlinedTextField(
                                value = if (selectedFarmer != null) "${selectedFarmer!!.farmerName} (${selectedFarmer!!.village})" else farmerSearchQuery,
                                onValueChange = {
                                    farmerSearchQuery = it
                                    selectedFarmer = null
                                    showFarmerDropdown = true
                                },
                                label = { Text(if (isPa) "ਕਿਸਾਨ ਚੁਣੋ" else "Select Farmer") },
                                modifier = Modifier.fillMaxWidth(),
                                trailingIcon = {
                                    if (selectedFarmer != null) {
                                        IconButton(onClick = { selectedFarmer = null; farmerSearchQuery = "" }) {
                                            Icon(Icons.Default.Clear, contentDescription = null)
                                        }
                                    }
                                }
                            )

                            if (showFarmerDropdown && selectedFarmer == null) {
                                val filtered = farmers.filter {
                                    it.farmerName.contains(farmerSearchQuery, ignoreCase = true) ||
                                    it.village.contains(farmerSearchQuery, ignoreCase = true)
                                }
                                Card(modifier = Modifier.fillMaxWidth().heightIn(max = 180.dp)) {
                                    LazyColumn {
                                        items(filtered) { f ->
                                            val remaining = viewModel.getRemainingBagsForFarmer(f.id)
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable {
                                                        selectedFarmer = f
                                                        showFarmerDropdown = false
                                                    }
                                                    .padding(12.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column {
                                                    Text(f.farmerName, fontWeight = FontWeight.Medium)
                                                    Text(f.village, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                                                }
                                                Text(
                                                    text = if (isPa) "ਬਾਕੀ: $remaining ਬੋਰੀਆਂ" else "Stock: $remaining bags",
                                                    color = if (remaining > 0) MandiGreenPrimary else TextMuted,
                                                    fontWeight = FontWeight.Bold,
                                                    style = MaterialTheme.typography.bodySmall
                                                )
                                            }
                                            HorizontalDivider()
                                        }
                                    }
                                }
                            }
                        }

                        selectedFarmer?.let { f ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(if (remainingBagsForSelected > 0) MandiGreenSubtle else DangerSubtle, RoundedCornerShape(8.dp))
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = if (isPa) "ਮੰਡੀ ਆਮਦ ਵਿੱਚੋਂ ਬਾਕੀ ਬੋਰੀਆਂ:" else "Remaining Mandi Stock:",
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "$remainingBagsForSelected ${if (isPa) "ਬੋਰੀਆਂ" else "Bags"}",
                                    fontWeight = FontWeight.Bold,
                                    color = if (remainingBagsForSelected > 0) MandiGreenPrimary else DangerRed
                                )
                            }
                        }

                        // Bags input
                        OutlinedTextField(
                            value = bagsInput,
                            onValueChange = { bagsInput = it.filter { c -> c.isDigit() } },
                            label = { Text(if (isPa) "ਖਰੀਦੀਆਂ ਜਾਣ ਵਾਲੀਆਂ ਬੋਰੀਆਂ" else "Bags to Purchase") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Live Weight and Amount Card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = BackgroundLight),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(if (isPa) "ਕੁੱਲ ਵਜ਼ਨ (37.50 KG/ਬੋਰੀ):" else "Calculated Weight:")
                                    Text(weightBreakdown.displayEn, fontWeight = FontWeight.Bold, color = WheatGold)
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(if (isPa) "ਸਰਕਾਰੀ ਰੇਟ (@₹${settings.fixedRatePerQtl.toInt()}):" else "Rate (@₹${settings.fixedRatePerQtl.toInt()}):")
                                    Text(Calculations.formatCurrencyINR(totalAmount), fontWeight = FontWeight.Bold, color = MandiGreenDark)
                                }
                            }
                        }

                        Button(
                            onClick = {
                                val farmer = selectedFarmer ?: return@Button
                                if (bagsToPurchase <= 0) {
                                    errorMessage = "Please enter valid number of bags"
                                    return@Button
                                }
                                val pur = DailyPurchaseRecord(
                                    id = UUID.randomUUID().toString(),
                                    date = Calculations.getTodayDDMMYYYY(),
                                    agency = selectedAgency,
                                    farmerId = farmer.id,
                                    farmerName = farmer.farmerName,
                                    farmerNamePa = farmer.farmerNamePa,
                                    fatherName = farmer.fatherName,
                                    village = farmer.village,
                                    mobile = farmer.mobile,
                                    aadhaar = farmer.aadhaar,
                                    bags = bagsToPurchase,
                                    qul = weightBreakdown.qtl,
                                    kg = weightBreakdown.kg,
                                    totalWeightKg = weightBreakdown.totalKg,
                                    totalWeightDisplay = weightBreakdown.displayEn,
                                    rate = settings.fixedRatePerQtl,
                                    totalAmount = totalAmount,
                                    createdAt = Calculations.getTodayDDMMYYYY()
                                )

                                viewModel.addDailyPurchase(
                                    purchase = pur,
                                    onSuccess = {
                                        showForm = false
                                        bagsInput = ""
                                        errorMessage = null
                                    },
                                    onError = { err -> errorMessage = err }
                                )
                            },
                            enabled = selectedFarmer != null && bagsToPurchase > 0,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WheatGold),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.ShoppingCartCheckout, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isPa) "ਖਰੀਦ ਦਰਜ ਕਰੋ" else "Confirm Purchase")
                        }
                    }
                }
            }
        }

        // Purchases List
        item {
            Text(
                text = if (isPa) "ਅੱਜ ਤੱਕ ਦੀਆਂ ਖਰੀਦਾਂ (${purchases.size})" else "Recorded Purchases (${purchases.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (purchases.isEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(if (isPa) "ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।" else "No purchase records yet.", color = TextMuted)
                    }
                }
            }
        } else {
            items(purchases) { pur ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = WheatGoldSubtle,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = pur.agency,
                                        fontWeight = FontWeight.Bold,
                                        color = WheatGold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelMedium
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(pur.date, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            }
                            IconButton(onClick = { viewModel.deleteDailyPurchase(pur.id) }) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = DangerRed)
                            }
                        }

                        Text(
                            text = "${pur.farmerName} (${pur.village})",
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.bodyLarge
                        )

                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("${pur.bags} ${if (isPa) "ਬੋਰੀਆਂ" else "Bags"} • ${pur.totalWeightDisplay}", style = MaterialTheme.typography.bodyMedium)
                            Text(Calculations.formatCurrencyINR(pur.totalAmount), fontWeight = FontWeight.Bold, color = MandiGreenDark)
                        }
                    }
                }
            }
        }
    }
}
