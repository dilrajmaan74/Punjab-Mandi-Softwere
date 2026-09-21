package com.example.punjabmandi.model

data class DailyPurchaseRecord(
    val id: String,
    val date: String,
    val agency: String,
    val farmerId: String,
    val farmerName: String,
    val farmerNamePa: String = "",
    val fatherName: String = "",
    val village: String = "",
    val mobile: String = "",
    val aadhaar: String = "",
    val mainFarmerId: String? = null,
    val bags: Int,
    val qul: Int,
    val kg: Double,
    val totalWeightKg: Double,
    val totalWeightDisplay: String = "",
    val rate: Double = 2461.0,
    val totalAmount: Double = 0.0,
    val createdAt: String = ""
)

data class BardanaReceivedRecord(
    val id: String,
    val date: String,
    val agency: String,
    val receivedFrom: String, // "AGENCY", "SELLER", "OTHER_PARTY"
    val sourceName: String,
    val bardanaType: String, // "NEW", "OLD", "BOTH"
    val newBags: Int = 0,
    val oldBags: Int = 0,
    val bags: Int = 0,
    val looseBags: Int = 0,
    val boxes: Int = 0,
    val remarks: String = "",
    val createdAt: String = ""
)

data class LeftingRecord(
    val id: String,
    val date: String,
    val agency: String = "",
    val sellerName: String,
    val destination: String = "",
    val truckNo: String,
    val driverName: String,
    val driverPhone: String = "",
    val bags: Int,
    val qul: Int,
    val kg: Double,
    val totalWeightKg: Double,
    val totalWeightDisplay: String = "",
    val status: String = "DISPATCHED",
    val createdAt: String = ""
)

data class FarmerAdvanceRecord(
    val id: String,
    val farmerId: String,
    val farmerName: String = "",
    val date: String,
    val amount: Double,
    val monthlyInterestRate: Double = 2.0,
    val interestTillDate: String = "",
    val interestAmount: Double = 0.0,
    val totalDays: Int = 0,
    val monthsElapsed: Int = 0,
    val daysElapsed: Int = 0,
    val totalPayableWithInterest: Double = 0.0,
    val createdAt: String = ""
)

data class FarmerPaymentRecord(
    val id: String,
    val farmerId: String,
    val date: String,
    val amount: Double,
    val paymentMode: String = "BANK_TRANSFER",
    val referenceNumber: String = "",
    val remarks: String = "",
    val createdAt: String = ""
)

data class BoliRecord(
    val id: String,
    val date: String,
    val farmerName: String,
    val heapNumber: String = "",
    val bags: Int,
    val qul: Int,
    val kg: Double,
    val totalWeightKg: Double,
    val rate: Double,
    val agency: String,
    val totalAmount: Double,
    val createdAt: String = ""
)

data class MandiSettings(
    val mandiNameEn: String = "Dana Mandi Kang Khurd",
    val mandiNamePa: String = "ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ",
    val marketCommitteeEn: String = "Lohian Khas",
    val marketCommitteePa: String = "ਲੋਹੀਆਂ ਖਾਸ",
    val firmNameEn: String = "Jammu Trading Co",
    val firmNamePa: String = "ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ",
    val firmAddress: String = "Shop No. 12, Dana Mandi Kang Khurd, Teh. Shahkot, Jalandhar - 144629",
    val firmMobile: String = "98147-74651",
    val fixedRatePerQtl: Double = 2461.0,
    val fixedBagWeightKg: Double = 37.50,
    val defaultPakkiLabourRate: Double = 8.0,
    val defaultPakkaDoubleLabourRate: Double = 14.0,
    val defaultSukhiLabourRate: Double = 5.0
)
