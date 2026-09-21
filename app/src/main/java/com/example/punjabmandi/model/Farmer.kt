package com.example.punjabmandi.model

data class BankDetails(
    val accountHolderName: String = "",
    val accountNumber: String = "",
    val ifscCode: String = "",
    val bankName: String = "",
    val branchName: String = ""
)

data class Farmer(
    val id: String,
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
    val bankDetails: BankDetails? = null,
    val createdAt: String = ""
)
