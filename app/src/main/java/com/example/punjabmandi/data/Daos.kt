package com.example.punjabmandi.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface FarmerDao {
    @Query("SELECT * FROM farmers ORDER BY id ASC")
    fun getAllFarmers(): Flow<List<FarmerEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFarmer(farmer: FarmerEntity)

    @Query("DELETE FROM farmers WHERE id = :id")
    suspend fun deleteFarmer(id: String)
}

@Dao
interface BagsEntryDao {
    @Query("SELECT * FROM bags_entries ORDER BY parchiNo DESC")
    fun getAllBagsEntries(): Flow<List<BagsEntryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBagsEntry(entry: BagsEntryEntity)

    @Query("DELETE FROM bags_entries WHERE id = :id")
    suspend fun deleteBagsEntry(id: String)
}

@Dao
interface DailyPurchaseDao {
    @Query("SELECT * FROM daily_purchases ORDER BY date DESC, id DESC")
    fun getAllPurchases(): Flow<List<DailyPurchaseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchase(purchase: DailyPurchaseEntity)

    @Query("DELETE FROM daily_purchases WHERE id = :id")
    suspend fun deletePurchase(id: String)
}

@Dao
interface BardanaDao {
    @Query("SELECT * FROM bardana_records ORDER BY date DESC, id DESC")
    fun getAllBardana(): Flow<List<BardanaEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBardana(record: BardanaEntity)

    @Query("DELETE FROM bardana_records WHERE id = :id")
    suspend fun deleteBardana(id: String)
}

@Dao
interface LeftingDao {
    @Query("SELECT * FROM lefting_records ORDER BY date DESC, id DESC")
    fun getAllLefting(): Flow<List<LeftingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLefting(record: LeftingEntity)

    @Query("DELETE FROM lefting_records WHERE id = :id")
    suspend fun deleteLefting(id: String)
}

@Dao
interface AdvanceDao {
    @Query("SELECT * FROM farmer_advances ORDER BY date DESC")
    fun getAllAdvances(): Flow<List<FarmerAdvanceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAdvance(advance: FarmerAdvanceEntity)

    @Query("DELETE FROM farmer_advances WHERE id = :id")
    suspend fun deleteAdvance(id: String)
}

@Dao
interface PaymentDao {
    @Query("SELECT * FROM farmer_payments ORDER BY date DESC")
    fun getAllPayments(): Flow<List<FarmerPaymentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayment(payment: FarmerPaymentEntity)

    @Query("DELETE FROM farmer_payments WHERE id = :id")
    suspend fun deletePayment(id: String)
}
