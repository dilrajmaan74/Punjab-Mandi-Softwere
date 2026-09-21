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
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.punjabmandi.model.BagsEntryRecord
import com.example.punjabmandi.model.Farmer
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BagsEntryScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val farmers by viewModel.farmers.collectAsState()
    val bagsEntries by viewModel.bagsEntries.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var showForm by remember { mutableStateOf(false) }
    var viewingSlip by remember { mutableStateOf<BagsEntryRecord?>(null) }

    // Form fields
    var selectedFarmer by remember { mutableStateOf<Farmer?>(null) }
    var farmerSearchQuery by remember { mutableStateOf("") }
    var showFarmerDropdown by remember { mutableStateOf(false) }

    var newBagsInput by remember { mutableStateOf("0") }
    var oldBagsInput by remember { mutableStateOf("0") }
    var totaKgInput by remember { mutableStateOf("0") }

    // Labour Deductions toggles and bag counts
    var pakkiEnabled by remember { mutableStateOf(false) }
    var pakkiBagsInput by remember { mutableStateOf("") }
    var doubleEnabled by remember { mutableStateOf(false) }
    var doubleBagsInput by remember { mutableStateOf("") }
    var sukhiEnabled by remember { mutableStateOf(false) }
    var sukkiBagsInput by remember { mutableStateOf("") }

    val newBags = newBagsInput.toIntOrNull() ?: 0
    val oldBags = oldBagsInput.toIntOrNull() ?: 0
    val totalBags = newBags + oldBags
    val totaKg = totaKgInput.toDoubleOrNull() ?: 0.0

    // Calculations
    val bagsWeightBreakdown = Calculations.calculateBagsWeight(totalBags, settings.fixedBagWeightKg)
    val grandTotalBreakdown = Calculations.calculateGrandTotal(bagsWeightBreakdown.totalKg, totaKg)
    val grossAmount = Calculations.calculatePayableAmount(grandTotalBreakdown.totalKg, settings.fixedRatePerQtl)

    val pakkiBags = if (pakkiEnabled) (pakkiBagsInput.toIntOrNull() ?: totalBags) else 0
    val doubleBags = if (doubleEnabled) (doubleBagsInput.toIntOrNull() ?: totalBags) else 0
    val sukkiBags = if (sukhiEnabled) (sukkiBagsInput.toIntOrNull() ?: totalBags) else 0

    val labourDeductions = Calculations.computeLabourDeductions(
        totalBags = totalBags,
        grossAmount = grossAmount,
        pakkiBags = pakkiBags,
        pakkiRate = settings.defaultPakkiLabourRate,
        doubleBags = doubleBags,
        doubleRate = settings.defaultPakkaDoubleLabourRate,
        sukkiBags = sukkiBags,
        sukkiRate = settings.defaultSukhiLabourRate
    )

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("bags_entry_screen"),
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
                        text = if (isPa) "ਮੰਡੀ ਆਮਦ (ਬੋਰੀਆਂ ਦੀ ਐਂਟਰੀ)" else "Mandi Bags Entry",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isPa) "ਪੱਕਾ ਵਜ਼ਨ: 37.50 ਕਿਲੋ ਪ੍ਰਤੀ ਬੋਰੀ • ਭਾਅ ₹${settings.fixedRatePerQtl.toInt()}" else "Fixed: 37.50 KG/bag • Rate ₹${settings.fixedRatePerQtl.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = {
                        showForm = !showForm
                        if (showForm) {
                            newBagsInput = "100"
                            oldBagsInput = "0"
                            totaKgInput = "0"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("toggle_new_entry_form")
                ) {
                    Icon(if (showForm) Icons.Default.Close else Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (showForm) (if (isPa) "ਬੰਦ ਕਰੋ" else "Close") else (if (isPa) "ਨਵੀਂ ਪਰਚੀ" else "New Entry"))
                }
            }
        }

        // Add Entry Card Form
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
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            text = if (isPa) "ਪਰਚੀ ਨੰਬਰ: #${viewModel.getNextParchiNumber()} • ਮਿਤੀ: ${Calculations.getTodayDDMMYYYY()}" else "Parchi No: #${viewModel.getNextParchiNumber()} • Date: ${Calculations.getTodayDDMMYYYY()}",
                            fontWeight = FontWeight.Bold,
                            color = MandiGreenDark,
                            style = MaterialTheme.typography.titleSmall
                        )

                        // Farmer Search & Selector
                        Column {
                            OutlinedTextField(
                                value = if (selectedFarmer != null) "${selectedFarmer!!.farmerName} (${selectedFarmer!!.village})" else farmerSearchQuery,
                                onValueChange = {
                                    farmerSearchQuery = it
                                    selectedFarmer = null
                                    showFarmerDropdown = true
                                },
                                label = { Text(if (isPa) "ਕਿਸਾਨ ਚੁਣੋ (ਨਾਮ, ਪਿੰਡ ਜਾਂ ਮੋਬਾਈਲ)" else "Select Farmer (Name, Village, Mobile)") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("farmer_search_field"),
                                trailingIcon = {
                                    if (selectedFarmer != null) {
                                        IconButton(onClick = {
                                            selectedFarmer = null
                                            farmerSearchQuery = ""
                                        }) {
                                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                                        }
                                    } else {
                                        Icon(Icons.Default.Search, contentDescription = "Search")
                                    }
                                }
                            )

                            if (showFarmerDropdown && selectedFarmer == null) {
                                val filtered = farmers.filter {
                                    it.farmerName.contains(farmerSearchQuery, ignoreCase = true) ||
                                    it.farmerNamePa.contains(farmerSearchQuery, ignoreCase = true) ||
                                    it.village.contains(farmerSearchQuery, ignoreCase = true) ||
                                    it.mobile.contains(farmerSearchQuery)
                                }
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(max = 180.dp),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                                ) {
                                    LazyColumn {
                                        items(filtered) { f ->
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable {
                                                        selectedFarmer = f
                                                        showFarmerDropdown = false
                                                    }
                                                    .padding(12.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Column {
                                                    Text(
                                                        text = "${f.farmerName} ${if (f.farmerNamePa.isNotBlank()) "(${f.farmerNamePa})" else ""}",
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                    Text(
                                                        text = "${f.village} • Mob: ${f.mobile}",
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = TextMuted
                                                    )
                                                }
                                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MandiGreenPrimary)
                                            }
                                            HorizontalDivider()
                                        }
                                    }
                                }
                            }
                        }

                        // Bags Inputs (New + Old Bardana)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedTextField(
                                value = newBagsInput,
                                onValueChange = { newBagsInput = it.filter { char -> char.isDigit() } },
                                label = { Text(if (isPa) "ਨਵਾਂ ਬਾਰਦਾਨਾ" else "New Bags") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("new_bags_input")
                            )

                            OutlinedTextField(
                                value = oldBagsInput,
                                onValueChange = { oldBagsInput = it.filter { char -> char.isDigit() } },
                                label = { Text(if (isPa) "ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ" else "Old Bags") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("old_bags_input")
                            )

                            OutlinedTextField(
                                value = totaKgInput,
                                onValueChange = { totaKgInput = it },
                                label = { Text(if (isPa) "ਤੋਟਾ (ਕਿਲੋ)" else "Tota (Kg)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("tota_input")
                            )
                        }

                        // Live Weight Breakdown Card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (isPa) "ਕੁੱਲ ਬੋਰੀਆਂ: $totalBags" else "Total Bags: $totalBags",
                                        fontWeight = FontWeight.Bold,
                                        color = MandiGreenDark
                                    )
                                    Text(
                                        text = "${bagsWeightBreakdown.displayEn} (37.50 KG)",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MandiGreenPrimary
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (isPa) "ਕੁੱਲ ਵਜ਼ਨ (ਬੋਰੀਆਂ + ਤੋਟਾ):" else "Grand Total Weight:",
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = grandTotalBreakdown.displayEn,
                                        fontWeight = FontWeight.Bold,
                                        color = WheatGold
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (isPa) "ਕੁੱਲ ਰਕਮ (@₹${settings.fixedRatePerQtl.toInt()}):" else "Gross Payable (@₹${settings.fixedRatePerQtl.toInt()}):",
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                    Text(
                                        text = Calculations.formatCurrencyINR(grossAmount),
                                        fontWeight = FontWeight.Bold,
                                        color = MandiGreenDark
                                    )
                                }
                            }
                        }

                        // Optional Labour Deductions Accordion
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = BackgroundLight),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = if (isPa) "ਲੇਬਰ ਕਟੌਤੀਆਂ (Labour Deductions)" else "Labour Deductions",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleSmall
                                )

                                // Pakki Labour
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Checkbox(
                                            checked = pakkiEnabled,
                                            onCheckedChange = {
                                                pakkiEnabled = it
                                                if (it && pakkiBagsInput.isBlank()) pakkiBagsInput = "$totalBags"
                                            }
                                        )
                                        Text(if (isPa) "ਪੱਕੀ ਲੇਬਰ (₹${settings.defaultPakkiLabourRate.toInt()}/ਬੋਰੀ)" else "Pakki Labour (₹${settings.defaultPakkiLabourRate.toInt()}/bag)")
                                    }
                                    if (pakkiEnabled) {
                                        OutlinedTextField(
                                            value = pakkiBagsInput,
                                            onValueChange = { pakkiBagsInput = it },
                                            modifier = Modifier.width(100.dp),
                                            label = { Text("Bags") },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                                        )
                                    }
                                }

                                // Pakka Double Labour
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Checkbox(
                                            checked = doubleEnabled,
                                            onCheckedChange = {
                                                doubleEnabled = it
                                                if (it && doubleBagsInput.isBlank()) doubleBagsInput = "$totalBags"
                                            }
                                        )
                                        Text(if (isPa) "ਪੱਖਾ ਡਬਲ (₹${settings.defaultPakkaDoubleLabourRate.toInt()}/ਬੋਰੀ)" else "Double Labour (₹${settings.defaultPakkaDoubleLabourRate.toInt()}/bag)")
                                    }
                                    if (doubleEnabled) {
                                        OutlinedTextField(
                                            value = doubleBagsInput,
                                            onValueChange = { doubleBagsInput = it },
                                            modifier = Modifier.width(100.dp),
                                            label = { Text("Bags") },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                                        )
                                    }
                                }

                                // Sukhi Labour
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Checkbox(
                                            checked = sukhiEnabled,
                                            onCheckedChange = {
                                                sukhiEnabled = it
                                                if (it && sukkiBagsInput.isBlank()) sukkiBagsInput = "$totalBags"
                                            }
                                        )
                                        Text(if (isPa) "ਸੁੱਕੀ ਲੇਬਰ (₹${settings.defaultSukhiLabourRate.toInt()}/ਬੋਰੀ)" else "Sukhi Labour (₹${settings.defaultSukhiLabourRate.toInt()}/bag)")
                                    }
                                    if (sukhiEnabled) {
                                        OutlinedTextField(
                                            value = sukkiBagsInput,
                                            onValueChange = { sukkiBagsInput = it },
                                            modifier = Modifier.width(100.dp),
                                            label = { Text("Bags") },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                                        )
                                    }
                                }

                                if (labourDeductions.totalLabourDeduction > 0) {
                                    HorizontalDivider()
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = if (isPa) "ਕੁੱਲ ਲੇਬਰ ਕਟੌਤੀ:" else "Total Labour:",
                                            color = DangerRed,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            text = "- ${Calculations.formatCurrencyINR(labourDeductions.totalLabourDeduction)} (${labourDeductions.labourDeductionBags} Bags eq)",
                                            color = DangerRed,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }

                        // Final Net Payable
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(WheatGoldSubtle, RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isPa) "ਨੈੱਟ ਦੇਣਯੋਗ ਰਕਮ (Net Payable):" else "Net Payable Amount:",
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = Calculations.formatCurrencyINR(labourDeductions.netPayableAmount),
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium,
                                color = MandiGreenDark
                            )
                        }

                        // Save Button
                        Button(
                            onClick = {
                                val farmer = selectedFarmer
                                if (farmer == null) {
                                    return@Button
                                }
                                if (totalBags <= 0) {
                                    return@Button
                                }

                                val entry = BagsEntryRecord(
                                    id = UUID.randomUUID().toString(),
                                    entryNumber = "ENT-${System.currentTimeMillis().toString().takeLast(4)}",
                                    parchiNo = viewModel.getNextParchiNumber(),
                                    date = Calculations.getTodayDDMMYYYY(),
                                    farmerId = farmer.id,
                                    farmerName = farmer.farmerName,
                                    farmerNamePa = farmer.farmerNamePa,
                                    farmerFatherName = farmer.fatherName,
                                    farmerVillage = farmer.village,
                                    farmerVillagePa = farmer.villagePa,
                                    farmerMobile = farmer.mobile,
                                    farmerAadhaar = farmer.aadhaar,
                                    newBags = newBags,
                                    oldBags = oldBags,
                                    bags = totalBags,
                                    weightPerBagKg = settings.fixedBagWeightKg,
                                    totalBagsWeightKg = bagsWeightBreakdown.totalKg,
                                    totalBagsWeightDisplay = bagsWeightBreakdown.displayEn,
                                    totaKg = totaKg,
                                    grandTotalKg = grandTotalBreakdown.totalKg,
                                    grandTotalDisplay = grandTotalBreakdown.displayEn,
                                    ratePerQtl = settings.fixedRatePerQtl,
                                    totalAmount = grossAmount,
                                    labourDeductions = labourDeductions,
                                    netAmount = labourDeductions.netPayableAmount,
                                    createdAt = Calculations.getTodayDDMMYYYY()
                                )

                                viewModel.addBagsEntry(entry) {
                                    showForm = false
                                    viewingSlip = entry
                                }
                            },
                            enabled = selectedFarmer != null && totalBags > 0,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .testTag("save_bags_entry_button"),
                            colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isPa) "ਪਰਚੀ ਦਰਜ ਕਰੋ ਤੇ ਸਲਿੱਪ ਦੇਖੋ" else "Save Entry & Print Slip")
                        }
                    }
                }
            }
        }

        // Entries List Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isPa) "ਦਰਜ ਕੀਤੀਆਂ ਪਰਚੀਆਂ (${bagsEntries.size})" else "Recorded Entries (${bagsEntries.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        if (bagsEntries.isEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(if (isPa) "ਕੋਈ ਪਰਚੀ ਦਰਜ ਨਹੀਂ ਹੋਈ।" else "No entries recorded yet.", color = TextMuted)
                    }
                }
            }
        } else {
            items(bagsEntries) { entry ->
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
                                Text(
                                    text = "ਪਰਚੀ #${entry.parchiNo}",
                                    fontWeight = FontWeight.Bold,
                                    color = MandiGreenPrimary,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = entry.date, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            }
                            Row {
                                IconButton(onClick = { viewingSlip = entry }) {
                                    Icon(Icons.Default.Receipt, contentDescription = "View Slip", tint = MandiGreenDark)
                                }
                                IconButton(onClick = { viewModel.deleteBagsEntry(entry.id) }) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = DangerRed)
                                }
                            }
                        }

                        Text(
                            text = "${entry.farmerName} ${if (entry.farmerNamePa.isNotBlank()) "(${entry.farmerNamePa})" else ""}",
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Text(
                            text = "${entry.farmerVillage} • Mob: ${entry.farmerMobile}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted
                        )

                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = if (isPa) "ਬੋਰੀਆਂ: ${entry.bags} (ਨਵੀਂ: ${entry.newBags}, ਪੁਰਾਣੀ: ${entry.oldBags})" else "Bags: ${entry.bags} (New: ${entry.newBags}, Old: ${entry.oldBags})",
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Text(
                                    text = if (isPa) "ਕੁੱਲ ਵਜ਼ਨ: ${entry.grandTotalDisplay}" else "Weight: ${entry.grandTotalDisplay}",
                                    fontWeight = FontWeight.SemiBold,
                                    color = WheatGold
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = Calculations.formatCurrencyINR(entry.netAmount),
                                    fontWeight = FontWeight.Bold,
                                    color = MandiGreenDark
                                )
                                if (entry.labourDeductions.totalLabourDeduction > 0) {
                                    Text(
                                        text = if (isPa) "ਲੇਬਰ ਕਟੌਤੀ: -₹${entry.labourDeductions.totalLabourDeduction.toInt()}" else "Labour: -₹${entry.labourDeductions.totalLabourDeduction.toInt()}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = DangerRed
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Weighment Slip Dialog
    viewingSlip?.let { slip ->
        Dialog(onDismissRequest = { viewingSlip = null }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Firm Header
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = settings.firmNamePa,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleLarge,
                            color = MandiGreenDark
                        )
                        Text(
                            text = settings.firmNameEn,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted
                        )
                        Text(
                            text = "${settings.mandiNamePa} • ${settings.marketCommitteePa}",
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = "ਮੋਬਾਈਲ: ${settings.firmMobile}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                    }

                    HorizontalDivider()

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("ਪਰਚੀ ਨੰਬਰ: #${slip.parchiNo}", fontWeight = FontWeight.Bold)
                        Text("ਮਿਤੀ: ${slip.date}", fontWeight = FontWeight.Medium)
                    }

                    Text("ਕਿਸਾਨ: ${slip.farmerName} ${if (slip.farmerNamePa.isNotBlank()) "(${slip.farmerNamePa})" else ""}")
                    Text("ਪਿਤਾ ਦਾ ਨਾਮ: ${slip.farmerFatherName}")
                    Text("ਪਿੰਡ: ${slip.farmerVillage}")
                    Text("ਮੋਬਾਈਲ: ${slip.farmerMobile}")

                    HorizontalDivider()

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("ਕੁੱਲ ਬੋਰੀਆਂ:")
                        Text("${slip.bags} ਬੋਰੀਆਂ (37.50 KG)", fontWeight = FontWeight.Bold)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("ਤੋਟਾ (ਕਿਲੋ):")
                        Text("${slip.totaKg} KG")
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("ਕੁੱਲ ਵਜ਼ਨ:")
                        Text(slip.grandTotalDisplay, fontWeight = FontWeight.Bold, color = WheatGold)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("ਭਾਅ ਪ੍ਰਤੀ ਕੁਇੰਟਲ:")
                        Text("₹${slip.ratePerQtl.toInt()}")
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("ਕੁੱਲ ਰਕਮ:")
                        Text(Calculations.formatCurrencyINR(slip.totalAmount), fontWeight = FontWeight.Bold)
                    }

                    if (slip.labourDeductions.totalLabourDeduction > 0) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("ਲੇਬਰ ਕਟੌਤੀ:", color = DangerRed)
                            Text("- ${Calculations.formatCurrencyINR(slip.labourDeductions.totalLabourDeduction)}", color = DangerRed, fontWeight = FontWeight.Bold)
                        }
                    }

                    HorizontalDivider()

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MandiGreenSubtle, RoundedCornerShape(8.dp))
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("ਨੈੱਟ ਦੇਣਯੋਗ ਰਕਮ:", fontWeight = FontWeight.Bold, color = MandiGreenDark)
                        Text(Calculations.formatCurrencyINR(slip.netAmount), fontWeight = FontWeight.Bold, color = MandiGreenDark)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Button(
                        onClick = { viewingSlip = null },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary)
                    ) {
                        Text(if (isPa) "ਬੰਦ ਕਰੋ" else "Close")
                    }
                }
            }
        }
    }
}
