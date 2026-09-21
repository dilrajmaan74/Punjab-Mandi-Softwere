package com.example.punjabmandi.ui.screens

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
import com.example.punjabmandi.model.LeftingRecord
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations
import java.util.UUID

@Composable
fun LeftingScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val leftingRecords by viewModel.leftingRecords.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var showForm by remember { mutableStateOf(false) }

    // Form fields
    var agency by remember { mutableStateOf("Markfed") }
    var sellerName by remember { mutableStateOf("") }
    var destination by remember { mutableStateOf("") }
    var truckNo by remember { mutableStateOf("PB-08-") }
    var driverName by remember { mutableStateOf("") }
    var driverPhone by remember { mutableStateOf("") }
    var bagsInput by remember { mutableStateOf("") }

    val bags = bagsInput.toIntOrNull() ?: 0
    val weightBreakdown = Calculations.calculateBagsWeight(bags, settings.fixedBagWeightKg)

    val totalLeftedBags = leftingRecords.sumOf { it.bags }
    val totalLeftedWeightKg = leftingRecords.sumOf { it.totalWeightKg }
    val totalWeightBreakdown = Calculations.formatKgToQulKg(totalLeftedWeightKg)

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("lefting_screen"),
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
                        text = if (isPa) "ਲਿਫਟਿੰਗ ਰਜਿਸਟਰ (Lefting / Dispatch)" else "Lefting / Dispatch Register",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isPa) "ਮੰਡੀ ਤੋਂ ਰਾਈਸ ਮਿੱਲਾਂ / ਸ਼ੈਲਰਾਂ ਨੂੰ ਟਰੱਕਾਂ ਰਾਹੀਂ ਮਾਲ ਭੇਜਣਾ" else "Truck dispatch from Mandi to Rice Shellers / Mills",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = { showForm = !showForm },
                    colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(if (showForm) Icons.Default.Close else Icons.Default.LocalShipping, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (showForm) (if (isPa) "ਬੰਦ ਕਰੋ" else "Close") else (if (isPa) "ਨਵੀਂ ਲਿਫਟਿੰਗ" else "Dispatch Truck"))
                }
            }
        }

        // Summary Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(if (isPa) "ਕੁੱਲ ਲਿਫਟ ਕੀਤੀਆਂ ਬੋਰੀਆਂ" else "Total Dispatched Bags", style = MaterialTheme.typography.bodySmall)
                        Text("$totalLeftedBags ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall, color = MandiGreenDark)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(if (isPa) "ਕੁੱਲ ਵਜ਼ਨ" else "Total Weight", style = MaterialTheme.typography.bodySmall)
                        Text(totalWeightBreakdown.displayEn, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = WheatGold)
                    }
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
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = if (isPa) "ਟਰੱਕ ਲਿਫਟਿੰਗ ਐਂਟਰੀ (Date: ${Calculations.getTodayDDMMYYYY()})" else "Truck Dispatch Entry (${Calculations.getTodayDDMMYYYY()})",
                            fontWeight = FontWeight.Bold,
                            color = MandiGreenDark,
                            style = MaterialTheme.typography.titleSmall
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = agency,
                                onValueChange = { agency = it },
                                label = { Text(if (isPa) "ਏਜੰਸੀ" else "Agency") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = sellerName,
                                onValueChange = { sellerName = it },
                                label = { Text(if (isPa) "ਸ਼ੈਲਰ ਦਾ ਨਾਮ" else "Sheller / Mill Name") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = truckNo,
                                onValueChange = { truckNo = it.uppercase() },
                                label = { Text(if (isPa) "ਟਰੱਕ ਨੰਬਰ" else "Truck No.") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = destination,
                                onValueChange = { destination = it },
                                label = { Text(if (isPa) "ਮੰਜ਼ਿਲ / ਸ਼ਹਿਰ" else "Destination") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = driverName,
                                onValueChange = { driverName = it },
                                label = { Text(if (isPa) "ਡਰਾਈਵਰ ਦਾ ਨਾਮ" else "Driver Name") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = driverPhone,
                                onValueChange = { driverPhone = it },
                                label = { Text(if (isPa) "ਡਰਾਈਵਰ ਫੋਨ" else "Driver Mobile") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        OutlinedTextField(
                            value = bagsInput,
                            onValueChange = { bagsInput = it.filter { c -> c.isDigit() } },
                            label = { Text(if (isPa) "ਲੋਡ ਕੀਤੀਆਂ ਬੋਰੀਆਂ (Bags)" else "Dispatched Bags") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = BackgroundLight)) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(if (isPa) "ਕੁੱਲ ਵਜ਼ਨ (37.50 KG/ਬੋਰੀ):" else "Dispatched Weight:")
                                Text(weightBreakdown.displayEn, fontWeight = FontWeight.Bold, color = WheatGold)
                            }
                        }

                        Button(
                            onClick = {
                                if (bags <= 0 || truckNo.isBlank() || sellerName.isBlank()) return@Button
                                val rec = LeftingRecord(
                                    id = UUID.randomUUID().toString(),
                                    date = Calculations.getTodayDDMMYYYY(),
                                    agency = agency,
                                    sellerName = sellerName,
                                    destination = destination,
                                    truckNo = truckNo,
                                    driverName = driverName,
                                    driverPhone = driverPhone,
                                    bags = bags,
                                    qul = weightBreakdown.qtl,
                                    kg = weightBreakdown.kg,
                                    totalWeightKg = weightBreakdown.totalKg,
                                    totalWeightDisplay = weightBreakdown.displayEn,
                                    createdAt = Calculations.getTodayDDMMYYYY()
                                )
                                viewModel.addLefting(rec) {
                                    showForm = false
                                    sellerName = ""
                                    destination = ""
                                    truckNo = "PB-08-"
                                    driverName = ""
                                    driverPhone = ""
                                    bagsInput = ""
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isPa) "ਲਿਫਟਿੰਗ ਦਰਜ ਕਰੋ" else "Save Dispatch")
                        }
                    }
                }
            }
        }

        // Records list
        item {
            Text(
                text = if (isPa) "ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ (${leftingRecords.size})" else "Dispatch Records (${leftingRecords.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (leftingRecords.isEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(if (isPa) "ਕੋਈ ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।" else "No dispatch records yet.", color = TextMuted)
                    }
                }
            }
        } else {
            items(leftingRecords) { rec ->
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
                                Surface(color = MandiGreenSubtle, shape = RoundedCornerShape(4.dp)) {
                                    Text(
                                        text = rec.truckNo,
                                        fontWeight = FontWeight.Bold,
                                        color = MandiGreenDark,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelMedium
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(rec.date, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            }
                            IconButton(onClick = { viewModel.deleteLefting(rec.id) }) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = null, tint = DangerRed)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "${rec.sellerName} ${if (rec.destination.isNotBlank()) "(${rec.destination})" else ""}",
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Text(
                            text = "Driver: ${rec.driverName} • ${rec.driverPhone} • Agency: ${rec.agency}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted
                        )

                        Spacer(modifier = Modifier.height(6.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${rec.bags} ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, color = MandiGreenDark)
                            Text(rec.totalWeightDisplay, fontWeight = FontWeight.Bold, color = WheatGold)
                        }
                    }
                }
            }
        }
    }
}
