package com.example.punjabmandi.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.punjabmandi.ui.screens.*
import com.example.punjabmandi.ui.theme.*
import kotlinx.coroutines.launch

data class NavigationItem(
    val screen: MandiScreen,
    val icon: ImageVector,
    val labelEn: String,
    val labelPa: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MandiApp(viewModel: MandiViewModel) {
    val currentScreen by viewModel.currentScreen.collectAsState()
    val language by viewModel.language.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val isPa = language == Language.PUNJABI

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val bottomNavItems = listOf(
        NavigationItem(MandiScreen.DASHBOARD, Icons.Default.Dashboard, "Home", "ਮੁੱਖ ਪੰਨਾ"),
        NavigationItem(MandiScreen.BAGS_ENTRY, Icons.Default.Inventory, "Bags", "ਆਮਦ"),
        NavigationItem(MandiScreen.DAILY_PURCHASE, Icons.Default.ShoppingCart, "Purchase", "ਖਰੀਦ"),
        NavigationItem(MandiScreen.FARMER_REGISTRATION, Icons.Default.People, "Farmers", "ਕਿਸਾਨ"),
        NavigationItem(MandiScreen.FARMER_ACCOUNT, Icons.Default.AccountBalance, "Accounts", "ਖਾਤਾ")
    )

    val drawerItems = listOf(
        NavigationItem(MandiScreen.DASHBOARD, Icons.Default.Dashboard, "Dashboard", "ਡੈਸ਼ਬੋਰਡ"),
        NavigationItem(MandiScreen.BAGS_ENTRY, Icons.Default.Inventory, "Bags Entry (Arrivals)", "ਮੰਡੀ ਆਮਦ (ਬੋਰੀਆਂ)"),
        NavigationItem(MandiScreen.DAILY_PURCHASE, Icons.Default.ShoppingCart, "Agency Purchase", "ਏਜੰਸੀ ਖਰੀਦ"),
        NavigationItem(MandiScreen.FARMER_REGISTRATION, Icons.Default.People, "Farmer Registration", "ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ"),
        NavigationItem(MandiScreen.FARMER_ACCOUNT, Icons.Default.AccountBalance, "Farmer Account Ledger", "ਕਿਸਾਨ ਖਾਤਾ ਰਜਿਸਟਰ"),
        NavigationItem(MandiScreen.BARDANA, Icons.Default.Archive, "Bardana Stock", "ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ"),
        NavigationItem(MandiScreen.LEFTING, Icons.Default.LocalShipping, "Lefting / Truck Dispatch", "ਲਿਫਟਿੰਗ (ਮਿੱਲਾਂ ਨੂੰ)"),
        NavigationItem(MandiScreen.REPORTS, Icons.Default.Assessment, "Reports & Balance", "ਰਿਪੋਰਟਾਂ ਤੇ ਚਾਰਟ"),
        NavigationItem(MandiScreen.SETTINGS, Icons.Default.Settings, "Firm & Mandi Settings", "ਫਰਮ ਤੇ ਮੰਡੀ ਸੈਟਿੰਗਾਂ")
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                modifier = Modifier.width(300.dp),
                drawerContainerColor = Color.White
            ) {
                // Drawer Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MandiGreenDark)
                        .padding(20.dp)
                ) {
                    Text(
                        text = if (isPa) settings.firmNamePa else settings.firmNameEn,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = if (isPa) "${settings.mandiNamePa} • ${settings.marketCommitteePa}" else "${settings.mandiNameEn} • ${settings.marketCommitteeEn}",
                        style = MaterialTheme.typography.bodySmall,
                        color = WheatGoldLight
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "ਸਰਕਾਰੀ ਭਾਅ: ₹${settings.fixedRatePerQtl.toInt()} • ਬੋਰੀ: 37.50 KG",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                drawerItems.forEach { item ->
                    NavigationDrawerItem(
                        icon = { Icon(item.icon, contentDescription = null) },
                        label = { Text(if (isPa) item.labelPa else item.labelEn, fontWeight = if (currentScreen == item.screen) FontWeight.Bold else FontWeight.Normal) },
                        selected = currentScreen == item.screen,
                        onClick = {
                            viewModel.setScreen(item.screen)
                            scope.launch { drawerState.close() }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
                        colors = NavigationDrawerItemDefaults.colors(
                            selectedContainerColor = MandiGreenSubtle,
                            selectedIconColor = MandiGreenDark,
                            selectedTextColor = MandiGreenDark
                        )
                    )
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = if (isPa) currentScreen.titlePa else currentScreen.titleEn,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = if (isPa) settings.firmNamePa else settings.firmNameEn,
                                style = MaterialTheme.typography.labelSmall,
                                color = WheatGoldLight
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(
                            onClick = { scope.launch { drawerState.open() } },
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
                        }
                    },
                    actions = {
                        // Language Toggle Chip
                        FilledTonalButton(
                            onClick = { viewModel.toggleLanguage() },
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = WheatGold,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(20.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier
                                .height(36.dp)
                                .testTag("language_toggle_button")
                        ) {
                            Icon(Icons.Default.Language, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isPa) "English" else "ਪੰਜਾਬੀ",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MandiGreenDark
                    )
                )
            },
            bottomBar = {
                NavigationBar(
                    containerColor = Color.White,
                    tonalElevation = 8.dp
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentScreen == item.screen
                        NavigationBarItem(
                            icon = { Icon(item.icon, contentDescription = item.labelEn) },
                            label = { Text(if (isPa) item.labelPa else item.labelEn, maxLines = 1) },
                            selected = selected,
                            onClick = { viewModel.setScreen(item.screen) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MandiGreenDark,
                                selectedTextColor = MandiGreenDark,
                                indicatorColor = MandiGreenSubtle
                            )
                        )
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(BackgroundLight)
            ) {
                when (currentScreen) {
                    MandiScreen.DASHBOARD -> DashboardScreen(viewModel = viewModel)
                    MandiScreen.BAGS_ENTRY -> BagsEntryScreen(viewModel = viewModel)
                    MandiScreen.DAILY_PURCHASE -> DailyPurchaseScreen(viewModel = viewModel)
                    MandiScreen.FARMER_REGISTRATION -> FarmerRegistrationScreen(viewModel = viewModel)
                    MandiScreen.FARMER_ACCOUNT -> FarmerAccountScreen(viewModel = viewModel)
                    MandiScreen.BARDANA -> BardanaScreen(viewModel = viewModel)
                    MandiScreen.LEFTING -> LeftingScreen(viewModel = viewModel)
                    MandiScreen.REPORTS -> ReportsScreen(viewModel = viewModel)
                    MandiScreen.SETTINGS -> SettingsScreen(viewModel = viewModel)
                }
            }
        }
    }
}
