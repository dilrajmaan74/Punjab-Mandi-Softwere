package com.example.punjabmandi.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations

@Composable
fun ReportsScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val summary by viewModel.dashboardSummary.collectAsState()
    val bagsEntries by viewModel.bagsEntries.collectAsState()
    val purchases by viewModel.purchases.collectAsState()
    val lefting by viewModel.leftingRecords.collectAsState()
    val farmers by viewModel.farmers.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf(
        if (isPa) "ਮੰਡੀ ਸੰਖੇਪ" else "Overview",
        if (isPa) "ਏਜੰਸੀ ਖਰੀਦ" else "Agencies",
        if (isPa) "ਕਿਸਾਨ ਲੇਜ਼ਰ" else "Farmers"
    )

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("reports_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column {
                Text(
                    text = if (isPa) "ਰਿਪੋਰਟਾਂ ਤੇ ਹਿਸਾਬ ਕਿਤਾਬ" else "Reports & Analytics",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${settings.firmNamePa} • ${settings.mandiNamePa}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted
                )
            }
        }

        item {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = MandiGreenPrimary
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }
        }

        when (selectedTab) {
            0 -> {
                // Overview Tab
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(if (isPa) "ਮੰਡੀ ਸਟਾਕ ਬਕਾਇਆ ਰਜਿਸਟਰ" else "Overall Stock Balance Register", fontWeight = FontWeight.Bold)

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਕੁੱਲ ਮੰਡੀ ਆਮਦ (Arrival Bags):")
                                Text("${summary.todayArrivalBags} ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਕੁੱਲ ਏਜੰਸੀ ਖਰੀਦ (Purchased Bags):")
                                Text("${summary.todayPurchasedBags} ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, color = WheatGold)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਕੁੱਲ ਸ਼ੈਲਰਾਂ ਨੂੰ ਲਿਫਟਿੰਗ (Dispatched Bags):")
                                Text("${summary.todayDispatchedBags} ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, color = InfoBlue)
                            }
                            HorizontalDivider()
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ ਸਟਾਕ (Pending in Mandi):", fontWeight = FontWeight.Bold)
                                Text("${summary.remainingStockBags} ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, color = if (summary.remainingStockBags > 0) WheatGold else MandiGreenDark)
                            }
                        }
                    }
                }

                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(if (isPa) "ਵਿੱਤੀ ਮੁੱਲ (Financial Value)" else "Financial Overview", fontWeight = FontWeight.Bold, color = MandiGreenDark)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("ਕੁੱਲ ਖਰੀਦ ਰਕਮ:")
                                Text(Calculations.formatCurrencyINR(summary.totalPurchasedAmount), fontWeight = FontWeight.Bold, color = MandiGreenDark)
                            }
                        }
                    }
                }
            }
            1 -> {
                // Agency breakdown
                val agencyGroups = purchases.groupBy { it.agency }
                item {
                    Text(if (isPa) "ਏਜੰਸੀ ਅਨੁਸਾਰ ਖਰੀਦ ਰਿਕਾਰਡ" else "Agency-wise Purchase Breakdown", fontWeight = FontWeight.Bold)
                }

                if (agencyGroups.isEmpty()) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                            Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                Text(if (isPa) "ਕੋਈ ਏਜੰਸੀ ਖਰੀਦ ਨਹੀਂ ਹੈ।" else "No agency purchases.", color = TextMuted)
                            }
                        }
                    }
                } else {
                    agencyGroups.forEach { (agency, records) ->
                        val agencyBags = records.sumOf { it.bags }
                        val agencyAmount = records.sumOf { it.totalAmount }
                        val agencyWeightKg = records.sumOf { it.totalWeightKg }
                        val breakdown = Calculations.formatKgToQulKg(agencyWeightKg)

                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(agency, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = WheatGold)
                                        Text("$agencyBags ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("ਕੁੱਲ ਵਜ਼ਨ: ${breakdown.displayEn}", style = MaterialTheme.typography.bodySmall, color = TextMuted)
                                        Text(Calculations.formatCurrencyINR(agencyAmount), fontWeight = FontWeight.SemiBold, color = MandiGreenDark)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
                // Farmers breakdown
                item {
                    Text(if (isPa) "ਕਿਸਾਨ ਵਾਰ ਬਕਾਇਆ ਸਟਾਕ" else "Farmer Stock Balance", fontWeight = FontWeight.Bold)
                }

                farmers.forEach { f ->
                    val arr = bagsEntries.filter { it.farmerId == f.id }.sumOf { it.bags }
                    val pur = purchases.filter { it.farmerId == f.id }.sumOf { it.bags }
                    val rem = (arr - pur).coerceAtLeast(0)

                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(f.farmerName, fontWeight = FontWeight.SemiBold)
                                    Text("ਪਿੰਡ: ${f.village} • ਆਮਦ: $arr • ਖਰੀਦ: $pur", style = MaterialTheme.typography.bodySmall, color = TextMuted)
                                }
                                Text(
                                    text = "$rem ਬਾਕੀ",
                                    fontWeight = FontWeight.Bold,
                                    color = if (rem > 0) WheatGold else MandiGreenDark
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
