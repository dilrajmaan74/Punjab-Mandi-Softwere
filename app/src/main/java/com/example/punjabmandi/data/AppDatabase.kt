package com.example.punjabmandi.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        FarmerEntity::class,
        BagsEntryEntity::class,
        DailyPurchaseEntity::class,
        BardanaEntity::class,
        LeftingEntity::class,
        FarmerAdvanceEntity::class,
        FarmerPaymentEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun farmerDao(): FarmerDao
    abstract fun bagsEntryDao(): BagsEntryDao
    abstract fun dailyPurchaseDao(): DailyPurchaseDao
    abstract fun bardanaDao(): BardanaDao
    abstract fun leftingDao(): LeftingDao
    abstract fun advanceDao(): AdvanceDao
    abstract fun paymentDao(): PaymentDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "punjab_mandi_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
