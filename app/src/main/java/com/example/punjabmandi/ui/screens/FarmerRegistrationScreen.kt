package com.example.punjabmandi.ui.screens

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
import com.example.punjabmandi.model.BankDetails
import com.example.punjabmandi.model.Farmer
import com.example.punjabmandi.ui.Language
import com.example.punjabmandi.ui.MandiViewModel
import com.example.punjabmandi.ui.theme.*
import com.example.punjabmandi.util.Calculations
import com.example.punjabmandi.util.PinCodesData
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FarmerRegistrationScreen(
    viewModel: MandiViewModel,
    modifier: Modifier = Modifier
) {
    val lang by viewModel.language.collectAsState()
    val isPa = lang == Language.PUNJABI
    val farmers by viewModel.farmers.collectAsState()

    var showForm by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Form inputs
    var nameEn by remember { mutableStateOf("") }
    var namePa by remember { mutableStateOf("") }
    var fatherEn by remember { mutableStateOf("") }
    var fatherPa by remember { mutableStateOf("") }
    var selectedPin by remember { mutableStateOf("144629") }
    var pinDropdownExpanded by remember { mutableStateOf(false) }
    var villageEn by remember { mutableStateOf("Kang Khurd") }
    var villagePa by remember { mutableStateOf("ਕੰਗ ਖੁਰਦ") }
    var villageDropdownExpanded by remember { mutableStateOf(false) }
    var mobile by remember { mutableStateOf("") }
    var aadhaar by remember { mutableStateOf("") }

    // Linking
    var linkToMainFarmer by remember { mutableStateOf(false) }
    var selectedMainFarmer by remember { mutableStateOf<Farmer?>(null) }
    var mainFarmerDropdownExpanded by remember { mutableStateOf(false) }

    // Bank Details
    var accHolder by remember { mutableStateOf("") }
    var accNumber by remember { mutableStateOf("") }
    var ifscCode by remember { mutableStateOf("") }
    val (autoBankName, autoBranch) = remember(ifscCode) { Calculations.lookupBankFromIFSC(ifscCode) }

    val currentPinMapping = remember(selectedPin) {
        PinCodesData.PIN_CODES.find { it.pinCode == selectedPin } ?: PinCodesData.PIN_CODES.first()
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .testTag("farmer_registration_screen"),
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
                        text = if (isPa) "ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ (Farmer Master)" else "Farmer Registration",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isPa) "ਕਿਸਾਨ ਵੇਰਵੇ, ਆਧਾਰ ਕਾਰਡ, ਬੈਂਕ ਖਾਤਾ ਅਤੇ ਲਿੰਕਿੰਗ" else "Aadhaar, Bank details & Main Farmer Linking",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }

                Button(
                    onClick = {
                        showForm = !showForm
                        errorMessage = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("toggle_new_farmer_form")
                ) {
                    Icon(if (showForm) Icons.Default.Close else Icons.Default.PersonAdd, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (showForm) (if (isPa) "ਬੰਦ ਕਰੋ" else "Close") else (if (isPa) "ਨਵਾਂ ਕਿਸਾਨ" else "New Farmer"))
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
                            text = if (isPa) "ਨਵੇਂ ਕਿਸਾਨ ਦੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ" else "Register New Farmer",
                            fontWeight = FontWeight.Bold,
                            color = MandiGreenDark,
                            style = MaterialTheme.typography.titleSmall
                        )

                        errorMessage?.let { msg ->
                            Text(
                                text = msg,
                                color = DangerRed,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        // Farmer Name (English & Punjabi)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = nameEn,
                                onValueChange = { nameEn = it },
                                label = { Text("Name (English) *") },
                                modifier = Modifier.weight(1f).testTag("farmer_name_en_input")
                            )
                            OutlinedTextField(
                                value = namePa,
                                onValueChange = { namePa = it },
                                label = { Text("ਨਾਮ (ਪੰਜਾਬੀ)") },
                                modifier = Modifier.weight(1f).testTag("farmer_name_pa_input")
                            )
                        }

                        // Father's Name (English & Punjabi)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = fatherEn,
                                onValueChange = { fatherEn = it },
                                label = { Text("Father Name (English)") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = fatherPa,
                                onValueChange = { fatherPa = it },
                                label = { Text("ਪਿਤਾ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ)") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // PIN Code & Village selector
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedTextField(
                                    value = selectedPin,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("PIN Code") },
                                    modifier = Modifier.fillMaxWidth(),
                                    trailingIcon = {
                                        IconButton(onClick = { pinDropdownExpanded = true }) {
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                        }
                                    }
                                )
                                DropdownMenu(
                                    expanded = pinDropdownExpanded,
                                    onDismissRequest = { pinDropdownExpanded = false }
                                ) {
                                    PinCodesData.PIN_CODES.forEach { pin ->
                                        DropdownMenuItem(
                                            text = { Text("${pin.pinCode} - ${pin.districtEn}") },
                                            onClick = {
                                                selectedPin = pin.pinCode
                                                villageEn = pin.villages.firstOrNull()?.en ?: ""
                                                villagePa = pin.villages.firstOrNull()?.pa ?: ""
                                                pinDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedTextField(
                                    value = "$villageEn ($villagePa)",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text(if (isPa) "ਪਿੰਡ (Village)" else "Village") },
                                    modifier = Modifier.fillMaxWidth(),
                                    trailingIcon = {
                                        IconButton(onClick = { villageDropdownExpanded = true }) {
                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                        }
                                    }
                                )
                                DropdownMenu(
                                    expanded = villageDropdownExpanded,
                                    onDismissRequest = { villageDropdownExpanded = false }
                                ) {
                                    currentPinMapping.villages.forEach { v ->
                                        DropdownMenuItem(
                                            text = { Text("${v.en} (${v.pa})") },
                                            onClick = {
                                                villageEn = v.en
                                                villagePa = v.pa
                                                villageDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        // Mobile & Aadhaar
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = mobile,
                                onValueChange = { if (it.length <= 10) mobile = it.filter { c -> c.isDigit() } },
                                label = { Text(if (isPa) "ਮੋਬਾਈਲ (10 ਅੰਕ)" else "Mobile (10 digits)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.weight(1f).testTag("farmer_mobile_input")
                            )

                            OutlinedTextField(
                                value = aadhaar,
                                onValueChange = { if (it.length <= 12) aadhaar = it.filter { c -> c.isDigit() } },
                                label = { Text(if (isPa) "ਆਧਾਰ ਨੰਬਰ (12 ਅੰਕ)" else "Aadhaar (12 digits)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f).testTag("farmer_aadhaar_input")
                            )
                        }

                        // Linking Section
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = BackgroundLight),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (isPa) "ਮੁੱਖ ਕਿਸਾਨ ਨਾਲ ਲਿੰਕ ਕਰੋ (Link Farmer)" else "Link to Main Farmer",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Switch(
                                        checked = linkToMainFarmer,
                                        onCheckedChange = { linkToMainFarmer = it }
                                    )
                                }

                                if (linkToMainFarmer) {
                                    Box {
                                        OutlinedTextField(
                                            value = selectedMainFarmer?.farmerName ?: (if (isPa) "ਮੁੱਖ ਕਿਸਾਨ ਚੁਣੋ" else "Select Main Farmer"),
                                            onValueChange = {},
                                            readOnly = true,
                                            label = { Text("Main Farmer") },
                                            modifier = Modifier.fillMaxWidth(),
                                            trailingIcon = {
                                                IconButton(onClick = { mainFarmerDropdownExpanded = true }) {
                                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                                }
                                            }
                                        )
                                        DropdownMenu(
                                            expanded = mainFarmerDropdownExpanded,
                                            onDismissRequest = { mainFarmerDropdownExpanded = false }
                                        ) {
                                            farmers.filter { it.linkedMainFarmerId == null }.forEach { f ->
                                                DropdownMenuItem(
                                                    text = { Text("${f.farmerName} (${f.village})") },
                                                    onClick = {
                                                        selectedMainFarmer = f
                                                        mainFarmerDropdownExpanded = false
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Bank Details Section
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = BackgroundLight),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = if (isPa) "ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ (Direct Benefit Transfer)" else "Bank Account Details",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                OutlinedTextField(
                                    value = accHolder,
                                    onValueChange = { accHolder = it },
                                    label = { Text("Account Holder Name") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = accNumber,
                                        onValueChange = { accNumber = it },
                                        label = { Text("Account Number") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f)
                                    )
                                    OutlinedTextField(
                                        value = ifscCode,
                                        onValueChange = { ifscCode = it.uppercase() },
                                        label = { Text("IFSC Code") },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                if (autoBankName.isNotBlank()) {
                                    Text(
                                        text = "ਬੈਂਕ: $autoBankName ($autoBranch)",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MandiGreenDark,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        Button(
                            onClick = {
                                if (nameEn.isBlank()) {
                                    errorMessage = "Farmer name is required"
                                    return@Button
                                }
                                val newFarmer = Farmer(
                                    id = "FARM-${System.currentTimeMillis().toString().takeLast(4)}",
                                    farmerName = nameEn.trim(),
                                    farmerNamePa = namePa.trim(),
                                    fatherName = fatherEn.trim(),
                                    fatherNamePa = fatherPa.trim(),
                                    village = villageEn,
                                    villagePa = villagePa,
                                    pinCode = selectedPin,
                                    mobile = mobile.trim(),
                                    aadhaar = aadhaar.trim(),
                                    linkedMainFarmerId = if (linkToMainFarmer) selectedMainFarmer?.id else null,
                                    linkedMainFarmerName = if (linkToMainFarmer) selectedMainFarmer?.farmerName else null,
                                    bankDetails = if (accNumber.isNotBlank()) {
                                        BankDetails(
                                            accountHolderName = if (accHolder.isNotBlank()) accHolder else nameEn,
                                            accountNumber = accNumber,
                                            ifscCode = ifscCode,
                                            bankName = autoBankName,
                                            branchName = autoBranch
                                        )
                                    } else null,
                                    createdAt = Calculations.getTodayDDMMYYYY()
                                )

                                viewModel.addFarmer(
                                    farmer = newFarmer,
                                    onSuccess = {
                                        showForm = false
                                        nameEn = ""
                                        namePa = ""
                                        fatherEn = ""
                                        fatherPa = ""
                                        mobile = ""
                                        aadhaar = ""
                                        errorMessage = null
                                    },
                                    onError = { err -> errorMessage = err }
                                )
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp).testTag("save_farmer_button"),
                            colors = ButtonDefaults.buttonColors(containerColor = MandiGreenPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isPa) "ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ" else "Save Farmer")
                        }
                    }
                }
            }
        }

        // Search Bar
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text(if (isPa) "ਕਿਸਾਨ ਖੋਜੋ (ਨਾਮ, ਪਿੰਡ, ਫੋਨ, ਆਧਾਰ)" else "Search Farmers") },
                modifier = Modifier.fillMaxWidth().testTag("farmer_search_input"),
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = null)
                        }
                    }
                }
            )
        }

        val filteredFarmers = farmers.filter {
            it.farmerName.contains(searchQuery, ignoreCase = true) ||
            it.farmerNamePa.contains(searchQuery, ignoreCase = true) ||
            it.village.contains(searchQuery, ignoreCase = true) ||
            it.mobile.contains(searchQuery) ||
            it.aadhaar.contains(searchQuery)
        }

        item {
            Text(
                text = if (isPa) "ਰਜਿਸਟਰਡ ਕਿਸਾਨ (${filteredFarmers.size})" else "Registered Farmers (${filteredFarmers.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        items(filteredFarmers) { farmer ->
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
                        Column {
                            Text(
                                text = "${farmer.farmerName} ${if (farmer.farmerNamePa.isNotBlank()) "(${farmer.farmerNamePa})" else ""}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            if (farmer.fatherName.isNotBlank()) {
                                Text(
                                    text = "S/o ${farmer.fatherName} ${if (farmer.fatherNamePa.isNotBlank()) "(${farmer.fatherNamePa})" else ""}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextMuted
                                )
                            }
                        }

                        IconButton(onClick = { viewModel.deleteFarmer(farmer.id) }) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = DangerRed)
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "ਪਿੰਡ: ${farmer.village} (${farmer.villagePa}) • PIN: ${farmer.pinCode}",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "ਮੋਬਾਈਲ: ${farmer.mobile} • ਆਧਾਰ: ${if (farmer.aadhaar.isNotBlank()) "XXXX-XXXX-${farmer.aadhaar.takeLast(4)}" else "N/A"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )

                    farmer.linkedMainFarmerName?.let { mainName ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Surface(
                            color = InfoSubtle,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = if (isPa) "ਮੁੱਖ ਕਿਸਾਨ ਨਾਲ ਲਿੰਕ: $mainName" else "Linked to: $mainName",
                                color = InfoBlue,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    farmer.bankDetails?.let { bank ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "ਬੈਂਕ: ${bank.bankName} • A/c: ${bank.accountNumber} • IFSC: ${bank.ifscCode}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MandiGreenDark
                        )
                    }
                }
            }
        }
    }
}
