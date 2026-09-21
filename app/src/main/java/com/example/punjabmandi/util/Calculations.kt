package com.example.punjabmandi.util

import com.example.punjabmandi.model.LabourAndDeductions
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.round

object Calculations {
    const val FIXED_BAG_WEIGHT_KG = 37.50
    const val FIXED_RATE_PER_QTL = 2461.0
    const val DEFAULT_CROP_BAG_CONVERSION_RATE = 925.0

    data class WeightBreakdown(
        val totalKg: Double,
        val qtl: Int,
        val kg: Double,
        val displayEn: String,
        val displayPa: String
    )

    fun formatKgToQulKg(rawKg: Double): WeightBreakdown {
        val roundedKg = round(rawKg * 100.0) / 100.0
        val qtl = floor(roundedKg / 100.0).toInt()
        val remainingKg = round((roundedKg - qtl * 100.0) * 100.0) / 100.0
        val kgStr = if (remainingKg % 1.0 == 0.0) remainingKg.toLong().toString() else String.format(Locale.US, "%.2f", remainingKg)

        return WeightBreakdown(
            totalKg = roundedKg,
            qtl = qtl,
            kg = remainingKg,
            displayEn = "$qtl Qul $kgStr Kg",
            displayPa = "$qtl ਕੁਇੰਟਲ $kgStr ਕਿਲੋ"
        )
    }

    fun calculateBagsWeight(bags: Int, bagWeightKg: Double = FIXED_BAG_WEIGHT_KG): WeightBreakdown {
        val totalKg = bags * bagWeightKg
        return formatKgToQulKg(totalKg)
    }

    fun calculateGrandTotal(bagsWeightKg: Double, totaKg: Double): WeightBreakdown {
        val totalKg = bagsWeightKg + totaKg
        return formatKgToQulKg(totalKg)
    }

    fun calculatePayableAmount(grandTotalKg: Double, ratePerQtl: Double = FIXED_RATE_PER_QTL): Double {
        val qtlDecimal = grandTotalKg / 100.0
        return round(qtlDecimal * ratePerQtl * 100.0) / 100.0
    }

    fun computeLabourDeductions(
        totalBags: Int,
        grossAmount: Double,
        pakkiBags: Int,
        pakkiRate: Double = 8.0,
        doubleBags: Int,
        doubleRate: Double = 14.0,
        sukkiBags: Int,
        sukkiRate: Double = 5.0
    ): LabourAndDeductions {
        val safeTotal = if (totalBags < 0) 0 else totalBags
        val safePakkiBags = if (pakkiBags < 0) 0 else pakkiBags
        val safeDoubleBags = if (doubleBags < 0) 0 else doubleBags
        val safeSukkiBags = if (sukkiBags < 0) 0 else sukkiBags

        val pakkiAmount = round(safePakkiBags * pakkiRate * 100.0) / 100.0
        val doubleAmount = round(safeDoubleBags * doubleRate * 100.0) / 100.0
        val sukkiAmount = round(safeSukkiBags * sukkiRate * 100.0) / 100.0

        val totalLabour = round((pakkiAmount + doubleAmount + sukkiAmount) * 100.0) / 100.0
        val deductionBags = if (totalLabour > 0) ceil(totalLabour / DEFAULT_CROP_BAG_CONVERSION_RATE).toInt() else 0
        val netPayable = round((grossAmount - totalLabour).coerceAtLeast(0.0) * 100.0) / 100.0

        return LabourAndDeductions(
            pakkiLabourEnabled = safePakkiBags > 0,
            pakkiLabourRate = pakkiRate,
            pakkiBagsCount = safePakkiBags,
            pakkiLabourAmount = pakkiAmount,
            pakkaDoubleLabourEnabled = safeDoubleBags > 0,
            pakkaDoubleLabourRate = doubleRate,
            doubleBagsCount = safeDoubleBags,
            pakkaDoubleLabourAmount = doubleAmount,
            sukhiLabourEnabled = safeSukkiBags > 0,
            sukhiLabourRate = sukkiRate,
            sukkiBagsCount = safeSukkiBags,
            sukhiLabourAmount = sukkiAmount,
            totalLabourDeduction = totalLabour,
            labourDeductionBags = deductionBags,
            netPayableAmount = netPayable
        )
    }

    data class AdvanceInterestResult(
        val principal: Double,
        val monthlyInterestRate: Double,
        val startDate: String,
        val endDate: String,
        val totalDays: Int,
        val monthsElapsed: Int,
        val daysElapsed: Int,
        val interestAmount: Double,
        val totalPayableWithInterest: Double
    )

    fun calculateAdvanceInterest(
        principal: Double,
        monthlyRatePercent: Double,
        startDateStr: String,
        endDateStr: String
    ): AdvanceInterestResult {
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.US)
        val startD = try { sdf.parse(startDateStr.trim()) ?: Date() } catch (e: Exception) { Date() }
        val endD = try { sdf.parse(endDateStr.trim()) ?: Date() } catch (e: Exception) { Date() }

        val diffMs = (endD.time - startD.time).coerceAtLeast(0)
        val totalDays = (diffMs / (1000 * 60 * 60 * 24)).toInt()

        val monthsElapsed = totalDays / 30
        val daysElapsed = totalDays % 30

        val monthlyInterest = principal * (monthlyRatePercent / 100.0)
        val dailyInterest = monthlyInterest / 30.0
        val interestAmount = round(((monthsElapsed * monthlyInterest) + (daysElapsed * dailyInterest)) * 100.0) / 100.0
        val totalPayable = round((principal + interestAmount) * 100.0) / 100.0

        return AdvanceInterestResult(
            principal = principal,
            monthlyInterestRate = monthlyRatePercent,
            startDate = startDateStr,
            endDate = endDateStr,
            totalDays = totalDays,
            monthsElapsed = monthsElapsed,
            daysElapsed = daysElapsed,
            interestAmount = interestAmount,
            totalPayableWithInterest = totalPayable
        )
    }

    fun getTodayDDMMYYYY(): String {
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.US)
        return sdf.format(Date())
    }

    fun formatCurrencyINR(amount: Double): String {
        val format = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
        return format.format(amount)
    }

    fun lookupBankFromIFSC(ifsc: String): Pair<String, String> {
        val clean = ifsc.trim().uppercase(Locale.US)
        if (clean.length < 4) return Pair("", "")
        val prefix = clean.take(4)
        return when (prefix) {
            "SBIN" -> Pair("State Bank of India", "Mandi Branch")
            "PUNB" -> Pair("Punjab National Bank", "Grain Market Branch")
            "PSIB" -> Pair("Punjab & Sind Bank", "Mandi Complex Branch")
            "HDFC" -> Pair("HDFC Bank", "Main Road Branch")
            "ICIC" -> Pair("ICICI Bank", "Commercial Branch")
            "UTIB" -> Pair("Axis Bank", "Market Yard Branch")
            "BARB" -> Pair("Bank of Baroda", "City Branch")
            "CNRB" -> Pair("Canara Bank", "Mandi Branch")
            "CLBL" -> Pair("Capital Small Finance Bank", "Main Branch")
            "PSTC" -> Pair("Punjab State Cooperative Bank", "Mandi Branch")
            else -> Pair("", "")
        }
    }
}
