package com.example.punjabmandi.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.punjabmandi.data.AppDatabase
import com.example.punjabmandi.data.MandiRepository
import com.example.punjabmandi.model.*
import com.example.punjabmandi.util.Calculations
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID

enum class MandiScreen(val titleEn: String, val titlePa: String) {
    DASHBOARD("Dashboard", "ਡੈਸ਼ਬੋਰਡ"),
    BAGS_ENTRY("Bags Entry", "ਮੰਡੀ ਆਮਦ (ਬੋਰੀਆਂ)"),
    DAILY_PURCHASE("Daily Purchase", "ਏਜੰਸੀ ਖਰੀਦ"),
    FARMER_REGISTRATION("Farmers", "ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ"),
    FARMER_ACCOUNT("Farmer Account", "ਕਿਸਾਨ ਖਾਤਾ ਰਜਿਸਟਰ"),
    BARDANA("Bardana", "ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ"),
    LEFTING("Lefting / Dispatch", "ਲਿਫਟਿੰਗ (ਮਿੱਲਾਂ ਨੂੰ ਭੇਜਣਾ)"),
    REPORTS("Reports", "ਰਿਪੋਰਟਾਂ ਤੇ ਚਾਰਟ"),
    SETTINGS("Settings", "ਸੈਟਿੰਗਾਂ")
}

enum class Language(val label: String) {
    PUNJABI("ਪੰਜਾਬੀ"),
    ENGLISH("English")
}

data class DashboardSummary(
    val totalFarmers: Int = 0,
    val todayArrivalBags: Int = 0,
    val todayPurchasedBags: Int = 0,
    val todayDispatchedBags: Int = 0,
    val remainingStockBags: Int = 0,
    val totalPurchasedAmount: Double = 0.0
)

class MandiViewModel(application: Application) : AndroidViewModel(application) {
    private val repository: MandiRepository
    
    private val _currentScreen = MutableStateFlow(MandiScreen.DASHBOARD)
    val currentScreen: StateFlow<MandiScreen> = _currentScreen.asStateFlow()

    private val _language = MutableStateFlow(Language.PUNJABI)
    val language: StateFlow<Language> = _language.asStateFlow()

    private val _settings = MutableStateFlow(MandiSettings())
    val settings: StateFlow<MandiSettings> = _settings.asStateFlow()

    val farmers = MutableStateFlow<List<Farmer>>(emptyList())
    val bagsEntries = MutableStateFlow<List<BagsEntryRecord>>(emptyList())
    val purchases = MutableStateFlow<List<DailyPurchaseRecord>>(emptyList())
    val bardanaRecords = MutableStateFlow<List<BardanaReceivedRecord>>(emptyList())
    val leftingRecords = MutableStateFlow<List<LeftingRecord>>(emptyList())
    val advances = MutableStateFlow<List<FarmerAdvanceRecord>>(emptyList())
    val payments = MutableStateFlow<List<FarmerPaymentRecord>>(emptyList())

    private val _dashboardSummary = MutableStateFlow(DashboardSummary())
    val dashboardSummary: StateFlow<DashboardSummary> = _dashboardSummary.asStateFlow()

    init {
        val db = AppDatabase.getDatabase(application)
        repository = MandiRepository(db)

        viewModelScope.launch {
            repository.allFarmers.collect { list ->
                farmers.value = list
                if (list.isEmpty()) seedSampleData()
                updateSummary()
            }
        }
        viewModelScope.launch {
            repository.allBagsEntries.collect { list ->
                bagsEntries.value = list
                updateSummary()
            }
        }
        viewModelScope.launch {
            repository.allPurchases.collect { list ->
                purchases.value = list
                updateSummary()
            }
        }
        viewModelScope.launch {
            repository.allBardana.collect { list ->
                bardanaRecords.value = list
            }
        }
        viewModelScope.launch {
            repository.allLefting.collect { list ->
                leftingRecords.value = list
                updateSummary()
            }
        }
        viewModelScope.launch {
            repository.allAdvances.collect { list ->
                advances.value = list
            }
        }
        viewModelScope.launch {
            repository.allPayments.collect { list ->
                payments.value = list
            }
        }
    }

    fun setScreen(screen: MandiScreen) {
        _currentScreen.value = screen
    }

    fun toggleLanguage() {
        _language.value = if (_language.value == Language.PUNJABI) Language.ENGLISH else Language.PUNJABI
    }

    fun updateSettings(newSettings: MandiSettings) {
        _settings.value = newSettings
    }

    private fun updateSummary() {
        val totalArrival = bagsEntries.value.sumOf { it.bags }
        val totalPurchased = purchases.value.sumOf { it.bags }
        val totalDispatched = leftingRecords.value.sumOf { it.bags }
        val remaining = (totalArrival - totalPurchased).coerceAtLeast(0)
        val purchaseAmt = purchases.value.sumOf { it.totalAmount }

        _dashboardSummary.value = DashboardSummary(
            totalFarmers = farmers.value.size,
            todayArrivalBags = totalArrival,
            todayPurchasedBags = totalPurchased,
            todayDispatchedBags = totalDispatched,
            remainingStockBags = remaining,
            totalPurchasedAmount = purchaseAmt
        )
    }

    fun getNextParchiNumber(): Int {
        val maxParchi = bagsEntries.value.maxOfOrNull { it.parchiNo } ?: 0
        return maxParchi + 1
    }

    fun getRemainingBagsForFarmer(farmerId: String): Int {
        val arrivalBags = bagsEntries.value.filter { it.farmerId == farmerId }.sumOf { it.bags }
        val purchasedBags = purchases.value.filter { it.farmerId == farmerId }.sumOf { it.bags }
        return (arrivalBags - purchasedBags).coerceAtLeast(0)
    }

    fun addFarmer(farmer: Farmer, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (farmer.farmerName.isBlank()) {
            onError("Farmer name is required")
            return
        }
        if (farmer.aadhaar.isNotBlank() && farmer.aadhaar.length == 12) {
            val exists = farmers.value.any { it.aadhaar == farmer.aadhaar && it.id != farmer.id }
            if (exists) {
                onError("Farmer with this Aadhaar already exists")
                return
            }
        }
        viewModelScope.launch {
            repository.insertFarmer(farmer)
            onSuccess()
        }
    }

    fun deleteFarmer(id: String) {
        viewModelScope.launch { repository.deleteFarmer(id) }
    }

    fun addBagsEntry(entry: BagsEntryRecord, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.insertBagsEntry(entry)
            onSuccess()
        }
    }

    fun deleteBagsEntry(id: String) {
        viewModelScope.launch { repository.deleteBagsEntry(id) }
    }

    fun addDailyPurchase(purchase: DailyPurchaseRecord, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val remaining = getRemainingBagsForFarmer(purchase.farmerId)
        if (purchase.bags > remaining) {
            onError("Entered bags (${purchase.bags}) exceed remaining stock ($remaining bags)")
            return
        }
        viewModelScope.launch {
            repository.insertPurchase(purchase)
            onSuccess()
        }
    }

    fun deleteDailyPurchase(id: String) {
        viewModelScope.launch { repository.deletePurchase(id) }
    }

    fun addBardana(record: BardanaReceivedRecord, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.insertBardana(record)
            onSuccess()
        }
    }

    fun deleteBardana(id: String) {
        viewModelScope.launch { repository.deleteBardana(id) }
    }

    fun addLefting(record: LeftingRecord, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.insertLefting(record)
            onSuccess()
        }
    }

    fun deleteLefting(id: String) {
        viewModelScope.launch { repository.deleteLefting(id) }
    }

    fun addAdvance(advance: FarmerAdvanceRecord, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.insertAdvance(advance)
            onSuccess()
        }
    }

    fun deleteAdvance(id: String) {
        viewModelScope.launch { repository.deleteAdvance(id) }
    }

    fun addPayment(payment: FarmerPaymentRecord, onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.insertPayment(payment)
            onSuccess()
        }
    }

    fun deletePayment(id: String) {
        viewModelScope.launch { repository.deletePayment(id) }
    }

    private fun seedSampleData() {
        viewModelScope.launch {
            val f1 = Farmer(
                id = "FARM-101",
                farmerName = "Gurpreet Singh",
                farmerNamePa = "ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ",
                fatherName = "Mukhtiar Singh",
                fatherNamePa = "ਮੁਖਤਿਆਰ ਸਿੰਘ",
                village = "Kang Khurd",
                villagePa = "ਕੰਗ ਖੁਰਦ",
                pinCode = "144629",
                mobile = "9876543210",
                aadhaar = "123456789012",
                bankDetails = BankDetails("Gurpreet Singh", "38192019281", "SBIN0001234", "State Bank of India", "Lohian Khas"),
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            val f2 = Farmer(
                id = "FARM-102",
                farmerName = "Harjinder Singh",
                farmerNamePa = "ਹਰਜਿੰਦਰ ਸਿੰਘ",
                fatherName = "Sohan Singh",
                fatherNamePa = "ਸੋਹਨ ਸਿੰਘ",
                village = "Lohian Khas",
                villagePa = "ਲੋਹੀਆਂ ਖਾਸ",
                pinCode = "144629",
                mobile = "9812345678",
                aadhaar = "987654321098",
                bankDetails = BankDetails("Harjinder Singh", "50100234567", "HDFC0001234", "HDFC Bank", "Shahkot"),
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            val f3 = Farmer(
                id = "FARM-103",
                farmerName = "Balwinder Singh",
                farmerNamePa = "ਬਲਵਿੰਦਰ ਸਿੰਘ",
                fatherName = "Gurpreet Singh",
                fatherNamePa = "ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ",
                village = "Kang Khurd",
                villagePa = "ਕੰਗ ਖੁਰਦ",
                pinCode = "144629",
                mobile = "9871122334",
                aadhaar = "554433221100",
                linkedMainFarmerId = "FARM-101",
                linkedMainFarmerName = "Gurpreet Singh",
                bankDetails = BankDetails("Balwinder Singh", "10293847561", "PUNB0123400", "Punjab National Bank", "Lohian"),
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            repository.insertFarmer(f1)
            repository.insertFarmer(f2)
            repository.insertFarmer(f3)

            // Seed Bags Entry
            val w1 = Calculations.calculateBagsWeight(100, 37.50)
            val grand1 = Calculations.calculateGrandTotal(w1.totalKg, 0.0)
            val gross1 = Calculations.calculatePayableAmount(grand1.totalKg, 2461.0)
            val labour1 = Calculations.computeLabourDeductions(100, gross1, 100, 8.0, 100, 14.0, 0, 5.0)

            val b1 = BagsEntryRecord(
                id = UUID.randomUUID().toString(),
                entryNumber = "ENT-001",
                parchiNo = 1,
                date = Calculations.getTodayDDMMYYYY(),
                farmerId = f1.id,
                farmerName = f1.farmerName,
                farmerNamePa = f1.farmerNamePa,
                farmerFatherName = f1.fatherName,
                farmerVillage = f1.village,
                farmerVillagePa = f1.villagePa,
                farmerMobile = f1.mobile,
                farmerAadhaar = f1.aadhaar,
                newBags = 80,
                oldBags = 20,
                bags = 100,
                weightPerBagKg = 37.50,
                totalBagsWeightKg = w1.totalKg,
                totalBagsWeightDisplay = w1.displayEn,
                totaKg = 0.0,
                grandTotalKg = grand1.totalKg,
                grandTotalDisplay = grand1.displayEn,
                ratePerQtl = 2461.0,
                totalAmount = gross1,
                labourDeductions = labour1,
                netAmount = labour1.netPayableAmount,
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            repository.insertBagsEntry(b1)

            // Seed Purchase
            val pur1 = DailyPurchaseRecord(
                id = UUID.randomUUID().toString(),
                date = Calculations.getTodayDDMMYYYY(),
                agency = "Markfed",
                farmerId = f1.id,
                farmerName = f1.farmerName,
                farmerNamePa = f1.farmerNamePa,
                fatherName = f1.fatherName,
                village = f1.village,
                mobile = f1.mobile,
                aadhaar = f1.aadhaar,
                bags = 50,
                qul = 18,
                kg = 75.0,
                totalWeightKg = 1875.0,
                totalWeightDisplay = "18 Qul 75 Kg",
                rate = 2461.0,
                totalAmount = 46143.75,
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            repository.insertPurchase(pur1)

            // Seed Bardana
            val bar1 = BardanaReceivedRecord(
                id = UUID.randomUUID().toString(),
                date = Calculations.getTodayDDMMYYYY(),
                agency = "Pungrain",
                receivedFrom = "AGENCY",
                sourceName = "Pungrain Godown",
                bardanaType = "NEW",
                newBags = 500,
                oldBags = 0,
                bags = 500,
                looseBags = 0,
                boxes = 1,
                remarks = "Bale No 45",
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            repository.insertBardana(bar1)

            // Seed Lefting
            val left1 = LeftingRecord(
                id = UUID.randomUUID().toString(),
                date = Calculations.getTodayDDMMYYYY(),
                agency = "Markfed",
                sellerName = "Baba Farid Rice Mill",
                destination = "Malsian",
                truckNo = "PB-08-AB-1234",
                driverName = "Kulwant Singh",
                driverPhone = "9872233445",
                bags = 50,
                qul = 18,
                kg = 75.0,
                totalWeightKg = 1875.0,
                totalWeightDisplay = "18 Qul 75 Kg",
                status = "DISPATCHED",
                createdAt = Calculations.getTodayDDMMYYYY()
            )
            repository.insertLefting(left1)
        }
    }
}
