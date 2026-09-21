package com.example.punjabmandi.data

import com.example.punjabmandi.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class MandiRepository(private val database: AppDatabase) {
    private val farmerDao = database.farmerDao()
    private val bagsDao = database.bagsEntryDao()
    private val purchaseDao = database.dailyPurchaseDao()
    private val bardanaDao = database.bardanaDao()
    private val leftingDao = database.leftingDao()
    private val advanceDao = database.advanceDao()
    private val paymentDao = database.paymentDao()

    val allFarmers: Flow<List<Farmer>> = farmerDao.getAllFarmers().map { list ->
        list.map { entity ->
            Farmer(
                id = entity.id,
                farmerName = entity.farmerName,
                farmerNamePa = entity.farmerNamePa,
                fatherName = entity.fatherName,
                fatherNamePa = entity.fatherNamePa,
                village = entity.village,
                villagePa = entity.villagePa,
                pinCode = entity.pinCode,
                mobile = entity.mobile,
                aadhaar = entity.aadhaar,
                linkedMainFarmerId = entity.linkedMainFarmerId,
                linkedMainFarmerName = entity.linkedMainFarmerName,
                bankDetails = if (entity.bankAccountNumber.isNotBlank()) {
                    BankDetails(
                        accountHolderName = entity.bankAccountHolder,
                        accountNumber = entity.bankAccountNumber,
                        ifscCode = entity.bankIfsc,
                        bankName = entity.bankName,
                        branchName = entity.bankBranch
                    )
                } else null,
                createdAt = entity.createdAt
            )
        }
    }

    val allBagsEntries: Flow<List<BagsEntryRecord>> = bagsDao.getAllBagsEntries().map { list ->
        list.map { entity ->
            BagsEntryRecord(
                id = entity.id,
                entryNumber = entity.entryNumber,
                parchiNo = entity.parchiNo,
                date = entity.date,
                farmerId = entity.farmerId,
                farmerName = entity.farmerName,
                farmerNamePa = entity.farmerNamePa,
                farmerFatherName = entity.farmerFatherName,
                farmerVillage = entity.farmerVillage,
                farmerVillagePa = entity.farmerVillagePa,
                farmerMobile = entity.farmerMobile,
                farmerAadhaar = entity.farmerAadhaar,
                newBags = entity.newBags,
                oldBags = entity.oldBags,
                bags = entity.bags,
                weightPerBagKg = entity.weightPerBagKg,
                totalBagsWeightKg = entity.totalBagsWeightKg,
                totalBagsWeightDisplay = entity.totalBagsWeightDisplay,
                totaKg = entity.totaKg,
                grandTotalKg = entity.grandTotalKg,
                grandTotalDisplay = entity.grandTotalDisplay,
                ratePerQtl = entity.ratePerQtl,
                totalAmount = entity.totalAmount,
                labourDeductions = LabourAndDeductions(
                    pakkiLabourEnabled = entity.pakkiLabourEnabled,
                    pakkiLabourRate = entity.pakkiLabourRate,
                    pakkiBagsCount = entity.pakkiBagsCount,
                    pakkiLabourAmount = entity.pakkiLabourAmount,
                    pakkaDoubleLabourEnabled = entity.pakkaDoubleLabourEnabled,
                    pakkaDoubleLabourRate = entity.pakkaDoubleLabourRate,
                    doubleBagsCount = entity.doubleBagsCount,
                    pakkaDoubleLabourAmount = entity.pakkaDoubleLabourAmount,
                    sukhiLabourEnabled = entity.sukhiLabourEnabled,
                    sukhiLabourRate = entity.sukhiLabourRate,
                    sukkiBagsCount = entity.sukkiBagsCount,
                    sukhiLabourAmount = entity.sukhiLabourAmount,
                    totalLabourDeduction = entity.totalLabourDeduction,
                    labourDeductionBags = entity.labourDeductionBags,
                    netPayableAmount = entity.netAmount
                ),
                netAmount = entity.netAmount,
                createdAt = entity.createdAt
            )
        }
    }

    val allPurchases: Flow<List<DailyPurchaseRecord>> = purchaseDao.getAllPurchases().map { list ->
        list.map { entity ->
            DailyPurchaseRecord(
                id = entity.id,
                date = entity.date,
                agency = entity.agency,
                farmerId = entity.farmerId,
                farmerName = entity.farmerName,
                farmerNamePa = entity.farmerNamePa,
                fatherName = entity.fatherName,
                village = entity.village,
                mobile = entity.mobile,
                aadhaar = entity.aadhaar,
                mainFarmerId = entity.mainFarmerId,
                bags = entity.bags,
                qul = entity.qul,
                kg = entity.kg,
                totalWeightKg = entity.totalWeightKg,
                totalWeightDisplay = entity.totalWeightDisplay,
                rate = entity.rate,
                totalAmount = entity.totalAmount,
                createdAt = entity.createdAt
            )
        }
    }

    val allBardana: Flow<List<BardanaReceivedRecord>> = bardanaDao.getAllBardana().map { list ->
        list.map { entity ->
            BardanaReceivedRecord(
                id = entity.id,
                date = entity.date,
                agency = entity.agency,
                receivedFrom = entity.receivedFrom,
                sourceName = entity.sourceName,
                bardanaType = entity.bardanaType,
                newBags = entity.newBags,
                oldBags = entity.oldBags,
                bags = entity.bags,
                looseBags = entity.looseBags,
                boxes = entity.boxes,
                remarks = entity.remarks,
                createdAt = entity.createdAt
            )
        }
    }

    val allLefting: Flow<List<LeftingRecord>> = leftingDao.getAllLefting().map { list ->
        list.map { entity ->
            LeftingRecord(
                id = entity.id,
                date = entity.date,
                agency = entity.agency,
                sellerName = entity.sellerName,
                destination = entity.destination,
                truckNo = entity.truckNo,
                driverName = entity.driverName,
                driverPhone = entity.driverPhone,
                bags = entity.bags,
                qul = entity.qul,
                kg = entity.kg,
                totalWeightKg = entity.totalWeightKg,
                totalWeightDisplay = entity.totalWeightDisplay,
                status = entity.status,
                createdAt = entity.createdAt
            )
        }
    }

    val allAdvances: Flow<List<FarmerAdvanceRecord>> = advanceDao.getAllAdvances().map { list ->
        list.map { entity ->
            FarmerAdvanceRecord(
                id = entity.id,
                farmerId = entity.farmerId,
                farmerName = entity.farmerName,
                date = entity.date,
                amount = entity.amount,
                monthlyInterestRate = entity.monthlyInterestRate,
                interestTillDate = entity.interestTillDate,
                interestAmount = entity.interestAmount,
                totalDays = entity.totalDays,
                monthsElapsed = entity.monthsElapsed,
                daysElapsed = entity.daysElapsed,
                totalPayableWithInterest = entity.totalPayableWithInterest,
                createdAt = entity.createdAt
            )
        }
    }

    val allPayments: Flow<List<FarmerPaymentRecord>> = paymentDao.getAllPayments().map { list ->
        list.map { entity ->
            FarmerPaymentRecord(
                id = entity.id,
                farmerId = entity.farmerId,
                date = entity.date,
                amount = entity.amount,
                paymentMode = entity.paymentMode,
                referenceNumber = entity.referenceNumber,
                remarks = entity.remarks,
                createdAt = entity.createdAt
            )
        }
    }

    suspend fun insertFarmer(farmer: Farmer) {
        farmerDao.insertFarmer(
            FarmerEntity(
                id = farmer.id,
                farmerName = farmer.farmerName,
                farmerNamePa = farmer.farmerNamePa,
                fatherName = farmer.fatherName,
                fatherNamePa = farmer.fatherNamePa,
                village = farmer.village,
                villagePa = farmer.villagePa,
                pinCode = farmer.pinCode,
                mobile = farmer.mobile,
                aadhaar = farmer.aadhaar,
                linkedMainFarmerId = farmer.linkedMainFarmerId,
                linkedMainFarmerName = farmer.linkedMainFarmerName,
                bankAccountHolder = farmer.bankDetails?.accountHolderName ?: "",
                bankAccountNumber = farmer.bankDetails?.accountNumber ?: "",
                bankIfsc = farmer.bankDetails?.ifscCode ?: "",
                bankName = farmer.bankDetails?.bankName ?: "",
                bankBranch = farmer.bankDetails?.branchName ?: "",
                createdAt = farmer.createdAt
            )
        )
    }

    suspend fun deleteFarmer(id: String) = farmerDao.deleteFarmer(id)

    suspend fun insertBagsEntry(entry: BagsEntryRecord) {
        bagsDao.insertBagsEntry(
            BagsEntryEntity(
                id = entry.id,
                entryNumber = entry.entryNumber,
                parchiNo = entry.parchiNo,
                date = entry.date,
                farmerId = entry.farmerId,
                farmerName = entry.farmerName,
                farmerNamePa = entry.farmerNamePa,
                farmerFatherName = entry.farmerFatherName,
                farmerVillage = entry.farmerVillage,
                farmerVillagePa = entry.farmerVillagePa,
                farmerMobile = entry.farmerMobile,
                farmerAadhaar = entry.farmerAadhaar,
                newBags = entry.newBags,
                oldBags = entry.oldBags,
                bags = entry.bags,
                weightPerBagKg = entry.weightPerBagKg,
                totalBagsWeightKg = entry.totalBagsWeightKg,
                totalBagsWeightDisplay = entry.totalBagsWeightDisplay,
                totaKg = entry.totaKg,
                grandTotalKg = entry.grandTotalKg,
                grandTotalDisplay = entry.grandTotalDisplay,
                ratePerQtl = entry.ratePerQtl,
                totalAmount = entry.totalAmount,
                pakkiLabourEnabled = entry.labourDeductions.pakkiLabourEnabled,
                pakkiLabourRate = entry.labourDeductions.pakkiLabourRate,
                pakkiBagsCount = entry.labourDeductions.pakkiBagsCount,
                pakkiLabourAmount = entry.labourDeductions.pakkiLabourAmount,
                pakkaDoubleLabourEnabled = entry.labourDeductions.pakkaDoubleLabourEnabled,
                pakkaDoubleLabourRate = entry.labourDeductions.pakkaDoubleLabourRate,
                doubleBagsCount = entry.labourDeductions.doubleBagsCount,
                pakkaDoubleLabourAmount = entry.labourDeductions.pakkaDoubleLabourAmount,
                sukhiLabourEnabled = entry.labourDeductions.sukhiLabourEnabled,
                sukhiLabourRate = entry.labourDeductions.sukhiLabourRate,
                sukkiBagsCount = entry.labourDeductions.sukkiBagsCount,
                sukhiLabourAmount = entry.labourDeductions.sukhiLabourAmount,
                totalLabourDeduction = entry.labourDeductions.totalLabourDeduction,
                labourDeductionBags = entry.labourDeductions.labourDeductionBags,
                netAmount = entry.netAmount,
                createdAt = entry.createdAt
            )
        )
    }

    suspend fun deleteBagsEntry(id: String) = bagsDao.deleteBagsEntry(id)

    suspend fun insertPurchase(purchase: DailyPurchaseRecord) {
        purchaseDao.insertPurchase(
            DailyPurchaseEntity(
                id = purchase.id,
                date = purchase.date,
                agency = purchase.agency,
                farmerId = purchase.farmerId,
                farmerName = purchase.farmerName,
                farmerNamePa = purchase.farmerNamePa,
                fatherName = purchase.fatherName,
                village = purchase.village,
                mobile = purchase.mobile,
                aadhaar = purchase.aadhaar,
                mainFarmerId = purchase.mainFarmerId,
                bags = purchase.bags,
                qul = purchase.qul,
                kg = purchase.kg,
                totalWeightKg = purchase.totalWeightKg,
                totalWeightDisplay = purchase.totalWeightDisplay,
                rate = purchase.rate,
                totalAmount = purchase.totalAmount,
                createdAt = purchase.createdAt
            )
        )
    }

    suspend fun deletePurchase(id: String) = purchaseDao.deletePurchase(id)

    suspend fun insertBardana(record: BardanaReceivedRecord) {
        bardanaDao.insertBardana(
            BardanaEntity(
                id = record.id,
                date = record.date,
                agency = record.agency,
                receivedFrom = record.receivedFrom,
                sourceName = record.sourceName,
                bardanaType = record.bardanaType,
                newBags = record.newBags,
                oldBags = record.oldBags,
                bags = record.bags,
                looseBags = record.looseBags,
                boxes = record.boxes,
                remarks = record.remarks,
                createdAt = record.createdAt
            )
        )
    }

    suspend fun deleteBardana(id: String) = bardanaDao.deleteBardana(id)

    suspend fun insertLefting(record: LeftingRecord) {
        leftingDao.insertLefting(
            LeftingEntity(
                id = record.id,
                date = record.date,
                agency = record.agency,
                sellerName = record.sellerName,
                destination = record.destination,
                truckNo = record.truckNo,
                driverName = record.driverName,
                driverPhone = record.driverPhone,
                bags = record.bags,
                qul = record.qul,
                kg = record.kg,
                totalWeightKg = record.totalWeightKg,
                totalWeightDisplay = record.totalWeightDisplay,
                status = record.status,
                createdAt = record.createdAt
            )
        )
    }

    suspend fun deleteLefting(id: String) = leftingDao.deleteLefting(id)

    suspend fun insertAdvance(advance: FarmerAdvanceRecord) {
        advanceDao.insertAdvance(
            FarmerAdvanceEntity(
                id = advance.id,
                farmerId = advance.farmerId,
                farmerName = advance.farmerName,
                date = advance.date,
                amount = advance.amount,
                monthlyInterestRate = advance.monthlyInterestRate,
                interestTillDate = advance.interestTillDate,
                interestAmount = advance.interestAmount,
                totalDays = advance.totalDays,
                monthsElapsed = advance.monthsElapsed,
                daysElapsed = advance.daysElapsed,
                totalPayableWithInterest = advance.totalPayableWithInterest,
                createdAt = advance.createdAt
            )
        )
    }

    suspend fun deleteAdvance(id: String) = advanceDao.deleteAdvance(id)

    suspend fun insertPayment(payment: FarmerPaymentRecord) {
        paymentDao.insertPayment(
            FarmerPaymentEntity(
                id = payment.id,
                farmerId = payment.farmerId,
                date = payment.date,
                amount = payment.amount,
                paymentMode = payment.paymentMode,
                referenceNumber = payment.referenceNumber,
                remarks = payment.remarks,
                createdAt = payment.createdAt
            )
        )
    }

    suspend fun deletePayment(id: String) = paymentDao.deletePayment(id)
}
