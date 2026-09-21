package com.example.punjabmandi.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "farmers")
data class FarmerEntity(
    @PrimaryKey val id: String,
    val farmerName: String,
    val farmerNamePa: String = "",
    val fatherName: String = "",
    val fatherNamePa: String = "",
    val village: String,
    val villagePa: String = "",
    val pinCode: String = "",
    val mobile: String = "",
    val aadhaar: String = "",
    val linkedMainFarmerId: String? = null,
    val linkedMainFarmerName: String? = null,
    val bankAccountHolder: String = "",
    val bankAccountNumber: String = "",
    val bankIfsc: String = "",
    val bankName: String = "",
    val bankBranch: String = "",
    val createdAt: String = ""
)

@Entity(tableName = "bags_entries")
data class BagsEntryEntity(
    @PrimaryKey val id: String,
    val entryNumber: String,
    val parchiNo: Int,
    val date: String,
    val farmerId: String,
    val farmerName: String,
    val farmerNamePa: String = "",
    val farmerFatherName: String = "",
    val farmerVillage: String,
    val farmerVillagePa: String = "",
    val farmerMobile: String = "",
    val farmerAadhaar: String = "",
    val newBags: Int = 0,
    val oldBags: Int = 0,
    val bags: Int = 0,
    val weightPerBagKg: Double = 37.50,
    val totalBagsWeightKg: Double = 0.0,
    val totalBagsWeightDisplay: String = "",
    val totaKg: Double = 0.0,
    val grandTotalKg: Double = 0.0,
    val grandTotalDisplay: String = "",
    val ratePerQtl: Double = 2461.0,
    val totalAmount: Double = 0.0,
    // Labour fields
    val pakkiLabourEnabled: Boolean = false,
    val pakkiLabourRate: Double = 8.0,
    val pakkiBagsCount: Int = 0,
    val pakkiLabourAmount: Double = 0.0,
    val pakkaDoubleLabourEnabled: Boolean = false,
    val pakkaDoubleLabourRate: Double = 14.0,
    val doubleBagsCount: Int = 0,
    val pakkaDoubleLabourAmount: Double = 0.0,
    val sukhiLabourEnabled: Boolean = false,
    val sukhiLabourRate: Double = 5.0,
    val sukkiBagsCount: Int = 0,
    val sukhiLabourAmount: Double = 0.0,
    val totalLabourDeduction: Double = 0.0,
    val labourDeductionBags: Int = 0,
    val netAmount: Double = 0.0,
    val createdAt: String = ""
)

@Entity(tableName = "daily_purchases")
data class DailyPurchaseEntity(
    @PrimaryKey val id: String,
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

@Entity(tableName = "bardana_records")
data class BardanaEntity(
    @PrimaryKey val id: String,
    val date: String,
    val agency: String,
    val receivedFrom: String,
    val sourceName: String,
    val bardanaType: String,
    val newBags: Int = 0,
    val oldBags: Int = 0,
    val bags: Int = 0,
    val looseBags: Int = 0,
    val boxes: Int = 0,
    val remarks: String = "",
    val createdAt: String = ""
)

@Entity(tableName = "lefting_records")
data class LeftingEntity(
    @PrimaryKey val id: String,
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

@Entity(tableName = "farmer_advances")
data class FarmerAdvanceEntity(
    @PrimaryKey val id: String,
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

@Entity(tableName = "farmer_payments")
data class FarmerPaymentEntity(
    @PrimaryKey val id: String,
    val farmerId: String,
    val date: String,
    val amount: Double,
    val paymentMode: String = "BANK_TRANSFER",
    val referenceNumber: String = "",
    val remarks: String = "",
    val createdAt: String = ""
)
