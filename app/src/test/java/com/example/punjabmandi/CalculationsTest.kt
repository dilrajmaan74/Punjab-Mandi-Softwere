package com.example.punjabmandi

import com.example.punjabmandi.util.Calculations
import org.junit.Assert.assertEquals
import org.junit.Test

class CalculationsTest {

    @Test
    fun testBagsWeightCalculation() {
        // 100 bags @ 37.50 KG = 3750 KG = 37 Qtl 50 Kg
        val result = Calculations.calculateBagsWeight(100, 37.50)
        assertEquals(3750.0, result.totalKg, 0.001)
        assertEquals(37, result.qtl)
        assertEquals(50.0, result.kg, 0.001)
        assertEquals("37 Qul 50.00 Kg", result.displayEn)
    }

    @Test
    fun testGrandTotalWeightWithTota() {
        // 3750 KG + 15 KG tota = 3765 KG = 37 Qtl 65 Kg
        val result = Calculations.calculateGrandTotal(3750.0, 15.0)
        assertEquals(3765.0, result.totalKg, 0.001)
        assertEquals(37, result.qtl)
        assertEquals(65.0, result.kg, 0.001)
    }

    @Test
    fun testPayableAmount() {
        // 100 kg = 1 quintal at ₹2461/quintal = ₹2461.0
        val amount = Calculations.calculatePayableAmount(100.0, 2461.0)
        assertEquals(2461.0, amount, 0.01)
    }

    @Test
    fun testLabourDeductions() {
        // 100 bags, gross = 92287.50
        // Pakki @ 8 = 800, Double @ 14 = 1400, Sukki @ 5 = 500 => Total Labour = 2700
        val labour = Calculations.computeLabourDeductions(
            totalBags = 100,
            grossAmount = 92287.50,
            pakkiBags = 100,
            pakkiRate = 8.0,
            doubleBags = 100,
            doubleRate = 14.0,
            sukkiBags = 100,
            sukkiRate = 5.0
        )
        assertEquals(2700.0, labour.totalLabourDeduction, 0.01)
        assertEquals(92287.50 - 2700.0, labour.netPayableAmount, 0.01)
    }

    @Test
    fun testAdvanceInterestCalculation() {
        // ₹10,000 at 2% monthly for 30 days = ₹200
        val interestResult = Calculations.calculateAdvanceInterest(
            principal = 10000.0,
            monthlyRatePercent = 2.0,
            startDateStr = "01/01/2026",
            endDateStr = "31/01/2026"
        )
        assertEquals(30, interestResult.totalDays)
        assertEquals(1, interestResult.monthsElapsed)
        assertEquals(0, interestResult.daysElapsed)
        assertEquals(200.0, interestResult.interestAmount, 0.01)
        assertEquals(10200.0, interestResult.totalPayableWithInterest, 0.01)
    }
}
