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
import com.example.punjabmandi.model.Farmer
import com.example.punjabmandi.model.FarmerAdvanceRecord
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FarmerAccountScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val farmers by viewModel.farmers.collectAsState()
    val bagsEntries by viewModel.bagsEntries.collectAsState()
    val purchases by viewModel.purchases.collectAsState()
    val advances by viewModel.advances.collectAsState()
    val payments by viewModel.payments.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var selectedFarmer by remember { mutableStateOf<Farmer?>(farmers.firstOrNull()) }
    var farmerDropdownExpanded by remember { mutableStateOf(false) }

    // Advance Payment Form Dialog
    var showAdvanceDialog by remember { mutableStateOf(false) }
    var advanceAmountInput by remember { mutableStateOf("") }
    var advanceRateInput by remember { mutableStateOf("2.0") }
    var advanceDateInput by remember { mutableStateOf(Calculations.getTodayDDMMYYYY()) }

    // Selected Farmer aggregations
    val currentFarmer = selectedFarmer
    val farmerArrivals = remember(currentFarmer, bagsEntries) {
        if (currentFarmer == null) emptyList()
        else bagsEntries.filter { it.farmerId == currentFarmer.id }
    }
    val farmerPurchases = remember(currentFarmer, purchases) {
        if (currentFarmer == null) emptyList()
        else purchases.filter { it.farmerId == currentFarmer.id }
    }
    val farmerAdvances = remember(currentFarmer, advances) {
        if (currentFarmer == null) emptyList()
        else advances.filter { it.farmerId == currentFarmer.id }
    }
    val farmerPayments = remember(currentFarmer, payments) {
        if (currentFarmer == null) emptyList()
        else payments.filter { it.farmerId == currentFarmer.id }
    }

    // Numbers
    val totalArrivalBags = farmerArrivals.sumOf { it.bags }
    val totalPurchasedBags = farmerPurchases.sumOf { it.bags }
    val remainingBags = (totalArrivalBags - totalPurchasedBags).coerceAtLeast(0)

    val grossArrivalAmount = farmerArrivals.sumOf { it.totalAmount }
    val totalLabourDeduction = farmerArrivals.sumOf { it.labourDeductions.totalLabourDeduction }
    val netArrivalPayable = farmerArrivals.sumOf { it.netAmount }

    val totalPurchasedAmount = farmerPurchases.sumOf { it.totalAmount }

    // Advances with calculated interest up to today
    val advancesWithInterest = farmerAdvances.map { adv ->
        val res = Calculations.calculateAdvanceInterest(
            principal = adv.amount,
            monthlyRatePercent = adv.monthlyInterestRate,
            startDateStr = adv.date,
            endDateStr = Calculations.getTodayDDMMYYYY()
        )
        adv.copy(
            interestAmount = res.interestAmount,
            totalDays = res.totalDays,
            monthsElapsed = res.monthsElapsed,
            daysElapsed = res.daysElapsed,
            totalPayableWithInterest = res.totalPayableWithInterest
        )
    }

    val totalAdvancePrincipal = advancesWithInterest.sumOf { it.amount }
    val totalAdvanceInterest = advancesWithInterest.sumOf { it.interestAmount }
    val totalAdvanceDeduction = totalAdvancePrincipal + totalAdvanceInterest

    val finalSettlementBalance = netArrivalPayable - totalAdvanceDeduction

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("farmer_account_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header
        item {
            Column {
                Text(
                    text = if (isPa) "ਕਿਸਾਨ ਖਾਤਾ ਰਜਿਸਟਰ (Farmer Account Ledger)" else "Farmer Account Reconciliation",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (isPa) "ਆਮਦ, ਖਰੀਦ, ਲੇਬਰ ਕਟੌਤੀ, ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ਦਾ ਪੂਰਾ ਹਿਸਾਬ" else "Complete reconciliation of arrivals, purchases, labour & interest",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted
                )
            }
        }

        // Farmer Selector Dropdown
        item {
            Box {
                OutlinedTextField(
                    value = currentFarmer?.let { "${it.farmerName} (${it.village}) • ${it.mobile}" } ?: (if (isPa) "ਕਿਸਾਨ ਚੁਣੋ" else "Select Farmer"),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(if (isPa) "ਕਿਸਾਨ ਖਾਤਾ ਚੁਣੋ" else "Select Farmer Account") },
                    modifier = Modifier.fillMaxWidth().testTag("select_farmer_account"),
                    trailingIcon = {
                        IconButton(onClick = { farmerDropdownExpanded = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                    }
                )
                DropdownMenu(
                    expanded = farmerDropdownExpanded,
                    onDismissRequest = { farmerDropdownExpanded = false }
                ) {
                    farmers.forEach { f ->
                        DropdownMenuItem(
                            text = { Text("${f.farmerName} (${f.village})") },
                            onClick = {
                                selectedFarmer = f
                                farmerDropdownExpanded = false
                            }
                        )
                    }
                }
            }
        }

        if (currentFarmer != null) {
            // Farmer Master Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "${currentFarmer.farmerName} ${if (currentFarmer.farmerNamePa.isNotBlank()) "(${currentFarmer.farmerNamePa})" else ""}",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium,
                                color = MandiGreenDark
                            )
                            Surface(color = WheatGoldSubtle, shape = RoundedCornerShape(4.dp)) {
                                Text(
                                    text = if (isPa) "ਪਿੰਡ: ${currentFarmer.village}" else currentFarmer.village,
                                    color = WheatGold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                        if (currentFarmer.fatherName.isNotBlank()) {
                            Text(
                                text = "S/o ${currentFarmer.fatherName} • Mob: ${currentFarmer.mobile}",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextMuted
                            )
                        }
                        if (currentFarmer.aadhaar.isNotBlank()) {
                            Text(
                                text = "Aadhaar: ${currentFarmer.aadhaar}",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            // High-level reconciliation tiles
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(if (isPa) "ਕੁੱਲ ਮੰਡੀ ਆਮਦ" else "Mandi Arrivals", style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            Text("$totalArrivalBags ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = MandiGreenDark)
                            Text(Calculations.formatCurrencyINR(grossArrivalAmount), style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(if (isPa) "ਏਜੰਸੀ ਖਰੀਦ" else "Agency Purchased", style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            Text("$totalPurchasedBags ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = WheatGold)
                            Text(Calculations.formatCurrencyINR(totalPurchasedAmount), style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(if (isPa) "ਬਾਕੀ ਸਟਾਕ" else "Remaining Stock", style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            Text("$remainingBags ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = if (remainingBags > 0) WheatGold else MandiGreenPrimary)
                            Text(if (remainingBags > 0) "Under Verification" else "Fully Cleared", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                        }
                    }
                }
            }

            // Financial Summary Ledger Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(14.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = if (isPa) "ਵਿੱਤੀ ਹਿਸਾਬ ਕਿਤਾਬ (Financial Reconciliation)" else "Financial Settlement Summary",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("1. ਫਸਲ ਦੀ ਕੁੱਲ ਰਕਮ (Gross Amount):")
                            Text(Calculations.formatCurrencyINR(grossArrivalAmount), fontWeight = FontWeight.SemiBold)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("2. ਲੇਬਰ ਕਟੌਤੀ (Labour Deductions):", color = DangerRed)
                            Text("- ${Calculations.formatCurrencyINR(totalLabourDeduction)}", color = DangerRed, fontWeight = FontWeight.SemiBold)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("3. ਨੈੱਟ ਫਸਲ ਮੁੱਲ (Net Crop Amount):", fontWeight = FontWeight.Bold)
                            Text(Calculations.formatCurrencyINR(netArrivalPayable), fontWeight = FontWeight.Bold, color = MandiGreenDark)
                        }

                        HorizontalDivider()

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("4. ਪੇਸ਼ਗੀ ਰਕਮ (Advance Principal):", color = DangerRed)
                            Text("- ${Calculations.formatCurrencyINR(totalAdvancePrincipal)}", color = DangerRed)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("5. ਪੇਸ਼ਗੀ ਵਿਆਜ (Advance Interest @2% p.m.):", color = DangerRed)
                            Text("- ${Calculations.formatCurrencyINR(totalAdvanceInterest)}", color = DangerRed)
                        }

                        HorizontalDivider()

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (finalSettlementBalance >= 0) MandiGreenSubtle else DangerSubtle, RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = if (isPa) "ਅੰਤਿਮ ਬਕਾਇਆ (Final Settlement):" else "Final Settlement Balance:",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text(
                                    text = if (finalSettlementBalance >= 0) (if (isPa) "ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ" else "Payable to Farmer") else (if (isPa) "ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ" else "Recoverable from Farmer"),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (finalSettlementBalance >= 0) MandiGreenDark else DangerRed
                                )
                            }
                            Text(
                                text = Calculations.formatCurrencyINR(finalSettlementBalance),
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.headlineMedium,
                                color = if (finalSettlementBalance >= 0) MandiGreenDark else DangerRed
                            )
                        }
                    }
                }
            }

            // Advance & Interest Register section
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isPa) "ਪੇਸ਼ਗੀ ਤੇ ਵਿਆਜ ਰਜਿਸਟਰ (${advancesWithInterest.size})" else "Advance & Interest Ledger (${advancesWithInterest.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Button(
                        onClick = { showAdvanceDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = WheatGold),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isPa) "ਨਵੀਂ ਪੇਸ਼ਗੀ (Advance)" else "Add Advance")
                    }
                }
            }

            if (advancesWithInterest.isEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                            Text(if (isPa) "ਇਸ ਕਿਸਾਨ ਦੀ ਕੋਈ ਪੇਸ਼ਗੀ ਨਹੀਂ ਹੈ।" else "No advances on record for this farmer.", color = TextMuted)
                        }
                    }
                }
            } else {
                items(advancesWithInterest) { adv ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਪੇਸ਼ਗੀ ਮਿਤੀ: ${adv.date}", fontWeight = FontWeight.Medium)
                                Text("ਮੂਲ ਰਕਮ: ${Calculations.formatCurrencyINR(adv.amount)}", fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "ਵਿਆਜ ਦਰ: ${adv.monthlyInterestRate}% ਮਹੀਨਾਵਾਰ • ਦਿਨ: ${adv.totalDays} (${adv.monthsElapsed} ਮਹੀਨੇ ${adv.daysElapsed} ਦਿਨ)",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextMuted
                            )
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਕੁੱਲ ਵਿਆਜ: ${Calculations.formatCurrencyINR(adv.interestAmount)}", color = DangerRed, style = MaterialTheme.typography.bodySmall)
                                Text("ਕੁੱਲ ਕਟੌਤੀ: ${Calculations.formatCurrencyINR(adv.totalPayableWithInterest)}", fontWeight = FontWeight.Bold, color = DangerRed)
                            }
                        }
                    }
                }
            }
        }
    }

    // Add Advance Dialog
    if (showAdvanceDialog && currentFarmer != null) {
        AlertDialog(
            onDismissRequest = { showAdvanceDialog = false },
            title = { Text(if (isPa) "ਨਵੀਂ ਪੇਸ਼ਗੀ ਦਰਜ ਕਰੋ" else "Add Advance Payment") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("ਕਿਸਾਨ: ${currentFarmer.farmerName} (${currentFarmer.village})", fontWeight = FontWeight.Medium)
                    OutlinedTextField(
                        value = advanceDateInput,
                        onValueChange = { advanceDateInput = it },
                        label = { Text(if (isPa) "ਮਿਤੀ (DD/MM/YYYY)" else "Date") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = advanceAmountInput,
                        onValueChange = { advanceAmountInput = it },
                        label = { Text(if (isPa) "ਪੇਸ਼ਗੀ ਰਕਮ (₹)" else "Advance Amount (₹)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = advanceRateInput,
                        onValueChange = { advanceRateInput = it },
                        label = { Text(if (isPa) "ਮਹੀਨਾਵਾਰ ਵਿਆਜ ਦਰ (%)" else "Monthly Interest Rate (%)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amt = advanceAmountInput.toDoubleOrNull() ?: 0.0
                        val rate = advanceRateInput.toDoubleOrNull() ?: 2.0
                        if (amt > 0) {
                            val adv = FarmerAdvanceRecord(
                                id = UUID.randomUUID().toString(),
                                farmerId = currentFarmer.id,
                                farmerName = currentFarmer.farmerName,
                                date = advanceDateInput,
                                amount = amt,
                                monthlyInterestRate = rate,
                                createdAt = Calculations.getTodayDDMMYYYY()
                            )
                            viewModel.addAdvance(adv) {
                                showAdvanceDialog = false
                                advanceAmountInput = ""
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary)
                ) {
                    Text(if (isPa) "ਦਰਜ ਕਰੋ" else "Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAdvanceDialog = false }) {
                    Text(if (isPa) "ਰੱਦ ਕਰੋ" else "Cancel")
                }
            }
        )
    }
}
