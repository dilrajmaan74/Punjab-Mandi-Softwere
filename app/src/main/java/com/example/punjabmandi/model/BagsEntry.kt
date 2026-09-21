package com.example.punjabmandi.model

data class LabourAndDeductions(
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
    val netPayableAmount: Double = 0.0
)

data class BagsEntryRecord(
    val id: String,
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
    val labourDeductions: LabourAndDeductions = LabourAndDeductions(),
    val netAmount: Double = 0.0,
    val createdAt: String = ""
)
