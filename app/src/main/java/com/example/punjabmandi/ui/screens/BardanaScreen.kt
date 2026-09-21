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
import com.example.punjabmandi.model.BardanaReceivedRecord
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BardanaScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val bardanaRecords by viewModel.bardanaRecords.collectAsState()

    var showForm by remember { mutableStateOf(false) }

    // Form fields
    var agency by remember { mutableStateOf("Pungrain") }
    var sourceName by remember { mutableStateOf("") }
    var bardanaType by remember { mutableStateOf("NEW") } // "NEW" or "OLD"
    var boxesInput by remember { mutableStateOf("1") }
    var looseInput by remember { mutableStateOf("0") }
    var remarks by remember { mutableStateOf("") }

    val boxes = boxesInput.toIntOrNull() ?: 0
    val loose = looseInput.toIntOrNull() ?: 0
    // 500 bags per bale/box for new, 50 bags per bundle for old
    val bagsPerBox = if (bardanaType == "NEW") 500 else 50
    val calculatedBags = (boxes * bagsPerBox) + loose

    val totalNewBags = bardanaRecords.sumOf { it.newBags }
    val totalOldBags = bardanaRecords.sumOf { it.oldBags }
    val totalAllBags = bardanaRecords.sumOf { it.bags }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("bardana_screen"),
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
                        text = if (isPa) "ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ (Bardana Stock)" else "Bardana Inventory",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isPa) "ਨਵਾਂ ਬਾਰਦਾਨਾ (500 ਬੋਰੀਆਂ/ਬੰਡਲ) • ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (50 ਬੋਰੀਆਂ)" else "New Bardana (500/bale) • Old Bardana (50/bundle)",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = { showForm = !showForm },
                    colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(if (showForm) Icons.Default.Close else Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (showForm) (if (isPa) "ਬੰਦ ਕਰੋ" else "Close") else (if (isPa) "ਬਾਰਦਾਨਾ ਐਂਟਰੀ" else "Add Bardana"))
                }
            }
        }

        // Summary Tiles
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(if (isPa) "ਨਵਾਂ ਬਾਰਦਾਨਾ" else "New Bags", style = MaterialTheme.typography.bodySmall)
                        Text("$totalNewBags", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall, color = MandiGreenDark)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = WheatGoldSubtle),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(if (isPa) "ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ" else "Old Bags", style = MaterialTheme.typography.bodySmall)
                        Text("$totalOldBags", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall, color = WheatGold)
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(if (isPa) "ਕੁੱਲ ਬਾਰਦਾਨਾ" else "Total Bags", style = MaterialTheme.typography.bodySmall)
                        Text("$totalAllBags", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall)
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
                            text = if (isPa) "ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਐਂਟਰੀ" else "Record Bardana Receipt",
                            fontWeight = FontWeight.Bold,
                            color = MandiGreenDark,
                            style = MaterialTheme.typography.titleSmall
                        )

                        // Bardana Type Selector
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            FilterChip(
                                selected = bardanaType == "NEW",
                                onClick = { bardanaType = "NEW" },
                                label = { Text(if (isPa) "ਨਵਾਂ ਬਾਰਦਾਨਾ (500/ਬੰਡਲ)" else "New (500/box)") }
                            )
                            FilterChip(
                                selected = bardanaType == "OLD",
                                onClick = { bardanaType = "OLD" },
                                label = { Text(if (isPa) "ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (50/ਗੱਠ)" else "Old (50/bundle)") }
                            )
                        }

                        OutlinedTextField(
                            value = agency,
                            onValueChange = { agency = it },
                            label = { Text(if (isPa) "ਏਜੰਸੀ / ਸਰੋਤ" else "Agency / Source") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = sourceName,
                            onValueChange = { sourceName = it },
                            label = { Text(if (isPa) "ਗੋਦਾਮ / ਸ਼ੈਲਰ ਦਾ ਨਾਮ" else "Godown / Mill Name") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = boxesInput,
                                onValueChange = { boxesInput = it.filter { c -> c.isDigit() } },
                                label = { Text(if (bardanaType == "NEW") "ਗੰਢਾਂ / Boxes" else "Bundles") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = looseInput,
                                onValueChange = { looseInput = it.filter { c -> c.isDigit() } },
                                label = { Text(if (isPa) "ਖੁੱਲ੍ਹੀਆਂ ਬੋਰੀਆਂ" else "Loose Bags") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Live calculation indicator
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MandiGreenSubtle)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(if (isPa) "ਕੁੱਲ ਬਾਰਦਾਨਾ ਬੋਰੀਆਂ:" else "Total Calculated Bags:")
                                Text("$calculatedBags ਬੋਰੀਆਂ", fontWeight = FontWeight.Bold, color = MandiGreenDark)
                            }
                        }

                        OutlinedTextField(
                            value = remarks,
                            onValueChange = { remarks = it },
                            label = { Text(if (isPa) "ਟਿੱਪਣੀ / ਬੇਲ ਨੰਬਰ" else "Remarks / Bale No.") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                if (calculatedBags <= 0) return@Button
                                val record = BardanaReceivedRecord(
                                    id = UUID.randomUUID().toString(),
                                    date = Calculations.getTodayDDMMYYYY(),
                                    agency = agency,
                                    receivedFrom = "AGENCY",
                                    sourceName = sourceName,
                                    bardanaType = bardanaType,
                                    newBags = if (bardanaType == "NEW") calculatedBags else 0,
                                    oldBags = if (bardanaType == "OLD") calculatedBags else 0,
                                    bags = calculatedBags,
                                    looseBags = loose,
                                    boxes = boxes,
                                    remarks = remarks,
                                    createdAt = Calculations.getTodayDDMMYYYY()
                                )
                                viewModel.addBardana(record) {
                                    showForm = false
                                    boxesInput = "1"
                                    looseInput = "0"
                                    remarks = ""
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isPa) "ਬਾਰਦਾਨਾ ਦਰਜ ਕਰੋ" else "Save Bardana")
                        }
                    }
                }
            }
        }

        // Records List
        item {
            Text(
                text = if (isPa) "ਬਾਰਦਾਨਾ ਰਜਿਸਟਰ (${bardanaRecords.size})" else "Bardana Ledger (${bardanaRecords.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (bardanaRecords.isEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(if (isPa) "ਕੋਈ ਬਾਰਦਾਨਾ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।" else "No bardana records yet.", color = TextMuted)
                    }
                }
            }
        } else {
            items(bardanaRecords) { rec ->
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
                                    color = if (rec.bardanaType == "NEW") MandiGreenSubtle else WheatGoldSubtle,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = if (rec.bardanaType == "NEW") "NEW BARDANA" else "OLD BARDANA",
                                        fontWeight = FontWeight.Bold,
                                        color = if (rec.bardanaType == "NEW") MandiGreenDark else WheatGold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(rec.date, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            }
                            IconButton(onClick = { viewModel.deleteBardana(rec.id) }) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = null, tint = DangerRed)
                            }
                        }

                        Text(
                            text = "${rec.agency} ${if (rec.sourceName.isNotBlank()) "• ${rec.sourceName}" else ""}",
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.bodyLarge
                        )

                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                text = "${rec.bags} ਬੋਰੀਆਂ (${rec.boxes} ਬਕਸੇ, ${rec.looseBags} ਖੁੱਲ੍ਹੀਆਂ)",
                                fontWeight = FontWeight.Bold,
                                color = MandiGreenDark
                            )
                            if (rec.remarks.isNotBlank()) {
                                Text(rec.remarks, style = MaterialTheme.typography.bodySmall, color = TextMuted)
                            }
                        }
                    }
                }
            }
        }
    }
}
