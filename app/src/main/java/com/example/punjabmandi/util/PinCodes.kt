package com.example.punjabmandi.util

data class VillageOption(val en: String, val pa: String)
data class PinCodeMapping(val pinCode: String, val districtEn: String, val districtPa: String, val villages: List<VillageOption>)

object PinCodesData {
    val PIN_CODES = listOf(
        PinCodeMapping(
            pinCode = "144629",
            districtEn = "Jalandhar (Shahkot / Lohian)",
            districtPa = "ਜਲੰਧਰ (ਸ਼ਾਹਕੋਟ / ਲੋਹੀਆਂ)",
            villages = listOf(
                VillageOption("Kang Khurd", "ਕੰਗ ਖੁਰਦ"),
                VillageOption("Lohian Khas", "ਲੋਹੀਆਂ ਖਾਸ"),
                VillageOption("Malsian", "ਮਲਸੀਆਂ"),
                VillageOption("Shahkot", "ਸ਼ਾਹਕੋਟ"),
                VillageOption("Giddarpindi", "ਗਿੱਦੜਪਿੰਡੀ"),
                VillageOption("Kang Kalan", "ਕੰਗ ਕਲਾਂ"),
                VillageOption("Rupewal", "ਰੂਪੇਵਾਲ"),
                VillageOption("Jaffarpur", "ਜਾਫਰਪੁਰ")
            )
        ),
        PinCodeMapping(
            pinCode = "141401",
            districtEn = "Ludhiana (Khanna)",
            districtPa = "ਲੁਧਿਆਣਾ (ਖੰਨਾ)",
            villages = listOf(
                VillageOption("Khanna", "ਖੰਨਾ"),
                VillageOption("Daudpur", "ਦਾਊਦਪੁਰ"),
                VillageOption("Mohanpur", "ਮੋਹਨਪੁਰ"),
                VillageOption("Alour", "ਅਲੌੜ"),
                VillageOption("Libran", "ਲੀਬੜਾ"),
                VillageOption("Bija", "ਬੀਜਾ"),
                VillageOption("Payal", "ਪਾਇਲ")
            )
        ),
        PinCodeMapping(
            pinCode = "141001",
            districtEn = "Ludhiana Central",
            districtPa = "ਲੁਧਿਆਣਾ ਸ਼ਹਿਰ",
            villages = listOf(
                VillageOption("Gill", "ਗਿੱਲ"),
                VillageOption("Dhandari Kalan", "ਢੰਡਾਰੀ ਕਲਾਂ"),
                VillageOption("Sunet", "ਸੁਨੇਤ"),
                VillageOption("Ayali Kalan", "ਅਯਾਲੀ ਕਲਾਂ"),
                VillageOption("Hambran", "ਹੰਬੜਾਂ")
            )
        ),
        PinCodeMapping(
            pinCode = "147001",
            districtEn = "Patiala",
            districtPa = "ਪਟਿਆਲਾ",
            villages = listOf(
                VillageOption("Patiala City", "ਪਟਿਆਲਾ ਸ਼ਹਿਰ"),
                VillageOption("Sanaur", "ਸਨੌਰ"),
                VillageOption("Dakala", "ਡਕਾਲਾ"),
                VillageOption("Bahadurgarh", "ਬਹਾਦਰਗੜ੍ਹ"),
                VillageOption("Kalyan", "ਕਲਿਆਣ")
            )
        ),
        PinCodeMapping(
            pinCode = "140001",
            districtEn = "Rupnagar (Ropar)",
            districtPa = "ਰੂਪਨਗਰ (ਰੋਪੜ)",
            villages = listOf(
                VillageOption("Rupnagar", "ਰੂਪਨਗਰ"),
                VillageOption("Haveli Kalan", "ਹਵੇਲੀ ਕਲਾਂ"),
                VillageOption("Ghanauli", "ਘਨੌਲੀ"),
                VillageOption("Purkhali", "ਪੁਰਖਾਲੀ"),
                VillageOption("Solkhian", "ਸੋਲਖੀਆਂ")
            )
        )
    )
}
