package com.example.punjabmandi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiScreen
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations

@Composable
fun DashboardScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val summary by viewModel.dashboardSummary.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val lang by viewModel.language.collectAsState()
    val bagsList by viewModel.bagsEntries.collectAsState()
    val isPa = lang == Language.PUNJABI

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("dashboard_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Firm & Mandi Header Banner
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MandiGreenDark),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = if (isPa) settings.firmNamePa else settings.firmNameEn,
                                style = MaterialTheme.typography.headlineMedium,
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${if (isPa) settings.mandiNamePa else settings.mandiNameEn} • ${if (isPa) settings.marketCommitteePa else settings.marketCommitteeEn}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = WheatGoldLight
                            )
                        }
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(WheatGold),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Agriculture,
                                contentDescription = "Mandi Icon",
                                tint = Color.White
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = MandiGreenPrimary)
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = if (isPa) "ਸਰਕਾਰੀ ਭਾਅ (MSP): ₹${settings.fixedRatePerQtl.toInt()} / ਕੁਇੰਟਲ" else "Govt MSP Rate: ₹${settings.fixedRatePerQtl.toInt()} / Qtl",
                            style = MaterialTheme.typography.labelLarge,
                            color = Color.White
                        )
                        Text(
                            text = if (isPa) "ਬੋਰੀ ਭਾਰ: 37.50 KG" else "Bag Wt: 37.50 KG",
                            style = MaterialTheme.typography.labelLarge,
                            color = WheatGoldLight
                        )
                    }
                }
            }
        }

        // Key Metrics Grid
        item {
            Text(
                text = if (isPa) "ਅੱਜ ਦਾ ਮੰਡੀ ਸੰਖੇਪ (Stock & Summary)" else "Mandi Overview & Stock",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = if (isPa) "ਕੁੱਲ ਕਿਸਾਨ" else "Total Farmers",
                    value = "${summary.totalFarmers}",
                    icon = Icons.Default.People,
                    containerColor = InfoSubtle,
                    contentColor = InfoBlue,
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = if (isPa) "ਕੁੱਲ ਆਮਦ (ਬੋਰੀਆਂ)" else "Total Arrival",
                    value = "${summary.todayArrivalBags}",
                    icon = Icons.Default.Inventory,
                    containerColor = MandiGreenSubtle,
                    contentColor = MandiGreenPrimary,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = if (isPa) "ਖਰੀਦ ਬੋਰੀਆਂ" else "Purchased",
                    value = "${summary.todayPurchasedBags}",
                    icon = Icons.Default.ShoppingCart,
                    containerColor = WheatGoldSubtle,
                    contentColor = WheatGold,
                    modifier = Modifier.weight(1f)
                )
                MetricCard(
                    title = if (isPa) "ਬਾਕੀ ਸਟਾਕ" else "Remaining Stock",
                    value = "${summary.remainingStockBags}",
                    icon = Icons.Default.Warehouse,
                    containerColor = if (summary.remainingStockBags > 0) WheatGoldSubtle else MandiGreenSubtle,
                    contentColor = if (summary.remainingStockBags > 0) WheatGold else MandiGreenPrimary,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Quick Actions
        item {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (isPa) "ਮੁੱਖ ਕਾਰਵਾਈਆਂ (Quick Actions)" else "Quick Actions",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.setScreen(MandiScreen.BAGS_ENTRY) },
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                            .testTag("action_bags_entry"),
                        colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.AddCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (isPa) "ਮੰਡੀ ਆਮਦ (ਬੋਰੀਆਂ)" else "Bags Entry", maxLines = 1)
                    }

                    Button(
                        onClick = { viewModel.setScreen(MandiScreen.DAILY_PURCHASE) },
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                            .testTag("action_purchase"),
                        colors = ButtonDefaults.buttonColors(containerColor = WheatGold),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (isPa) "ਏਜੰਸੀ ਖਰੀਦ" else "Purchase", maxLines = 1)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { viewModel.setScreen(MandiScreen.FARMER_REGISTRATION) },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                            .testTag("action_farmers"),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isPa) "ਨਵਾਂ ਕਿਸਾਨ" else "New Farmer", maxLines = 1)
                    }

                    OutlinedButton(
                        onClick = { viewModel.setScreen(MandiScreen.FARMER_ACCOUNT) },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                            .testTag("action_account"),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.AccountBalance, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isPa) "ਕਿਸਾਨ ਖਾਤਾ" else "Accounts", maxLines = 1)
                    }
                }
            }
        }

        // Recent Arrivals List
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isPa) "ਤਾਜ਼ਾ ਮੰਡੀ ਐਂਟਰੀਆਂ (Recent Arrivals)" else "Recent Mandi Arrivals",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = { viewModel.setScreen(MandiScreen.BAGS_ENTRY) }) {
                    Text(if (isPa) "ਸਾਰੀਆਂ ਦੇਖੋ" else "View All", color = MandiGreenPrimary)
                }
            }
        }

        if (bagsList.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isPa) "ਅਜੇ ਕੋਈ ਬੋਰੀਆਂ ਦੀ ਐਂਟਰੀ ਨਹੀਂ ਹੋਈ।" else "No bag entries yet.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextMuted
                        )
                    }
                }
            }
        } else {
            items(bagsList.take(5)) { entry ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(MandiGreenSubtle),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "#${entry.parchiNo}",
                                    fontWeight = FontWeight.Bold,
                                    color = MandiGreenPrimary,
                                    fontSize = 12.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = if (isPa && entry.farmerNamePa.isNotBlank()) entry.farmerNamePa else entry.farmerName,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "${entry.farmerVillage} • ${entry.date}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextMuted
                                )
                            }
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${entry.bags} ${if (isPa) "ਬੋਰੀਆਂ" else "Bags"}",
                                fontWeight = FontWeight.Bold,
                                color = MandiGreenDark,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = entry.grandTotalDisplay,
                                style = MaterialTheme.typography.bodySmall,
                                color = WheatGold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    containerColor: Color,
    contentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = containerColor),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextDark,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = contentColor,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = contentColor
            )
        }
    }
}
