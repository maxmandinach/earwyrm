package com.earwyrm.app.feature.onboarding

import android.content.Context
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.DmSansFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.auth.AuthManager
import com.earwyrm.app.core.supabase.FollowManager
import kotlinx.coroutines.launch

// ──────────────────────────────────────────────────────────────────
// Artist data by genre — matching iOS
// ──────────────────────────────────────────────────────────────────

private val genreArtists: Map<String, List<String>> = linkedMapOf(
    "Pop" to listOf("Taylor Swift", "Billie Eilish", "Olivia Rodrigo", "Dua Lipa", "Harry Styles", "Sabrina Carpenter", "Beyonc\u00e9", "Ariana Grande", "Lana Del Rey", "Charli XCX", "Chappell Roan", "Troye Sivan"),
    "Hip-Hop" to listOf("Kendrick Lamar", "Drake", "Tyler the Creator", "Travis Scott", "J. Cole", "Kanye West", "MF DOOM", "JID", "21 Savage", "Future"),
    "Rap" to listOf("Eminem", "Nicki Minaj", "Lil Wayne", "Mac Miller", "Tupac", "Nas", "Jay-Z", "A\$AP Rocky", "Joey Bada\$\$", "Denzel Curry"),
    "R&B" to listOf("SZA", "The Weeknd", "Frank Ocean", "Daniel Caesar", "Steve Lacy", "Summer Walker", "Erykah Badu", "Kehlani"),
    "Soul" to listOf("Stevie Wonder", "Marvin Gaye", "Amy Winehouse", "Aretha Franklin", "Al Green", "Otis Redding", "Leon Bridges"),
    "Rock" to listOf("Radiohead", "Arctic Monkeys", "Fleetwood Mac", "The Beatles", "Led Zeppelin", "Pink Floyd", "Queen", "Nirvana", "The Strokes", "David Bowie", "The Rolling Stones"),
    "Alternative" to listOf("Gorillaz", "The 1975", "Glass Animals", "Cage the Elephant", "Twenty One Pilots", "The Smashing Pumpkins", "Pixies", "Weezer"),
    "Indie" to listOf("Phoebe Bridgers", "Hozier", "Tame Impala", "Bon Iver", "Mitski", "Clairo", "Vampire Weekend", "The National", "Japanese Breakfast", "Boygenius", "Alex G", "Beach House"),
    "Punk" to listOf("The Clash", "Green Day", "Blink-182", "My Chemical Romance", "Turnstile", "Paramore", "The Ramones"),
    "Metal" to listOf("Metallica", "Tool", "Deftones", "System of a Down", "Gojira", "Slipknot", "Black Sabbath"),
    "Country" to listOf("Zach Bryan", "Noah Kahan", "Morgan Wallen", "Chris Stapleton", "Kacey Musgraves", "Tyler Childers", "Sturgill Simpson", "Johnny Cash", "Willie Nelson"),
    "Folk" to listOf("Iron & Wine", "Fleet Foxes", "Joni Mitchell", "Nick Drake", "Elliott Smith", "Adrianne Lenker", "Bob Dylan", "Simon & Garfunkel", "Sufjan Stevens"),
    "Latin" to listOf("Bad Bunny", "Peso Pluma", "Rosal\u00eda", "Karol G", "Rauw Alejandro", "Feid", "J Balvin", "Shakira"),
    "K-Pop" to listOf("BTS", "BLACKPINK", "NewJeans", "Stray Kids", "aespa", "TWICE", "LE SSERAFIM"),
    "Electronic" to listOf("Fred again..", "Aphex Twin", "Daft Punk", "Flume", "ODESZA", "Jamie xx", "Disclosure", "Caribou", "Four Tet"),
    "Jazz" to listOf("Miles Davis", "John Coltrane", "Kamasi Washington", "Norah Jones", "Robert Glasper", "Thelonious Monk", "Nina Simone"),
    "Jam Band" to listOf("Grateful Dead", "Phish", "Widespread Panic", "Goose", "Billy Strings", "Khruangbin", "The Allman Brothers Band", "String Cheese Incident"),
    "Poetry" to listOf("Rupi Kaur", "Amanda Gorman", "Ocean Vuong", "Mary Oliver", "Lang Leav", "Atticus", "Warsan Shire", "Pablo Neruda", "Sylvia Plath", "Edgar Allan Poe")
)

private val allGenres = genreArtists.keys.toList()

// ──────────────────────────────────────────────────────────────────
// SharedPreferences helper
// ──────────────────────────────────────────────────────────────────

private const val PREFS_NAME = "earwyrm_onboarding"
private const val KEY_HAS_SEEN_INTEREST_PICKER = "hasSeenInterestPicker"

fun hasSeenInterestPicker(context: Context): Boolean {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getBoolean(KEY_HAS_SEEN_INTEREST_PICKER, false)
}

fun markInterestPickerSeen(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_HAS_SEEN_INTEREST_PICKER, true)
        .apply()
}

// ──────────────────────────────────────────────────────────────────
// InterestPickerSheet — 2-step onboarding (genres -> artists)
// ──────────────────────────────────────────────────────────────────

@Composable
fun InterestPickerSheet(
    authManager: AuthManager,
    followManager: FollowManager,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val userId = authManager.userId

    // State
    var step by remember { mutableIntStateOf(0) } // 0 = genres, 1 = artists
    val selectedGenres = remember { mutableStateListOf<String>() }
    val followedArtists = remember { mutableStateListOf<String>() }
    var searchQuery by remember { mutableStateOf("") }

    // Existing follows from FollowManager
    val follows by followManager.follows.collectAsState()

    fun isArtistFollowed(artist: String): Boolean {
        return followedArtists.contains(artist) ||
            follows.any { it.filterType == "artist" && it.filterValue.equals(artist, ignoreCase = true) }
    }

    fun completeAndDismiss() {
        markInterestPickerSeen(context)
        onDismiss()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.background)
    ) {
        AnimatedContent(
            targetState = step,
            transitionSpec = {
                if (targetState > initialState) {
                    slideInHorizontally { it } togetherWith slideOutHorizontally { -it }
                } else {
                    slideInHorizontally { -it } togetherWith slideOutHorizontally { it }
                }
            },
            label = "step_transition"
        ) { currentStep ->
            when (currentStep) {
                0 -> GenrePickerStep(
                    selectedGenres = selectedGenres,
                    onGenreToggle = { genre ->
                        if (selectedGenres.contains(genre)) selectedGenres.remove(genre)
                        else selectedGenres.add(genre)
                    },
                    onNext = { step = 1 },
                    onSkip = { completeAndDismiss() }
                )
                1 -> ArtistPickerStep(
                    selectedGenres = selectedGenres,
                    followedArtists = followedArtists,
                    searchQuery = searchQuery,
                    onSearchQueryChange = { searchQuery = it },
                    isArtistFollowed = ::isArtistFollowed,
                    onToggleArtist = { artist ->
                        if (isArtistFollowed(artist)) {
                            followedArtists.remove(artist)
                            val followId = followManager.getFollowId("artist", artist)
                            if (followId != null && userId != null) {
                                scope.launch { followManager.unfollow(followId, userId) }
                            }
                        } else {
                            followedArtists.add(artist)
                            if (userId != null) {
                                scope.launch { followManager.follow(userId, "artist", artist) }
                            }
                        }
                    },
                    onDone = { completeAndDismiss() },
                    onSkip = { completeAndDismiss() },
                    followCount = followedArtists.size + follows.count { it.filterType == "artist" && !followedArtists.contains(it.filterValue) }
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────
// Step 1: Genre Picker
// ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GenrePickerStep(
    selectedGenres: List<String>,
    onGenreToggle: (String) -> Unit,
    onNext: () -> Unit,
    onSkip: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        // Skip button
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            TextButton(onClick = onSkip) {
                Text(
                    "Skip",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = Theme.textMuted
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Title
        Text(
            text = "what do you listen to?",
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.SemiBold,
            color = Theme.textPrimary
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Subtitle
        Text(
            text = "pick your favorite genres",
            style = Theme.dmSans(14f),
            color = Theme.textSecondary
        )

        Spacer(modifier = Modifier.height(28.dp))

        // Genre chips
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.weight(1f)
        ) {
            allGenres.forEach { genre ->
                GenreChip(
                    genre = genre,
                    isSelected = selectedGenres.contains(genre),
                    onClick = { onGenreToggle(genre) }
                )
            }
        }

        // Next button
        if (selectedGenres.isNotEmpty()) {
            Button(
                onClick = onNext,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Next", style = Theme.dmSans(16f, FontWeight.Medium))
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun GenreChip(
    genre: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor by animateColorAsState(
        targetValue = if (isSelected) Theme.accent else Color.Transparent,
        animationSpec = tween(200),
        label = "chip_bg"
    )
    val textColor by animateColorAsState(
        targetValue = if (isSelected) Color.White else Theme.textPrimary,
        animationSpec = tween(200),
        label = "chip_text"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) Theme.accent else Theme.divider,
        animationSpec = tween(200),
        label = "chip_border"
    )

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(backgroundColor)
            .border(1.dp, borderColor, RoundedCornerShape(20.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Text(
            text = genre,
            fontFamily = DmSansFamily,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = textColor
        )
    }
}

// ──────────────────────────────────────────────────────────────────
// Step 2: Artist Picker
// ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ArtistPickerStep(
    selectedGenres: List<String>,
    followedArtists: List<String>,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    isArtistFollowed: (String) -> Boolean,
    onToggleArtist: (String) -> Unit,
    onDone: () -> Unit,
    onSkip: () -> Unit,
    followCount: Int
) {
    // Build filtered artist list
    val suggestedArtists = remember(selectedGenres.toList()) {
        selectedGenres.flatMap { genre ->
            genreArtists[genre].orEmpty().map { artist -> artist to genre }
        }.distinctBy { it.first }
    }

    val filteredArtists = remember(suggestedArtists, searchQuery) {
        if (searchQuery.isBlank()) suggestedArtists
        else suggestedArtists.filter { (artist, _) ->
            artist.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        // Top row: follow count pill + skip/done
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Follow count pill
            if (followCount > 0) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Theme.accent.copy(alpha = 0.15f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "$followCount following",
                        style = Theme.dmSans(12f, FontWeight.SemiBold),
                        color = Theme.accent
                    )
                }
            } else {
                Spacer(modifier = Modifier.width(1.dp))
            }

            TextButton(onClick = if (followCount > 0) onDone else onSkip) {
                Text(
                    text = if (followCount > 0) "Done" else "Skip",
                    style = Theme.dmSans(14f, FontWeight.Medium),
                    color = if (followCount > 0) Theme.accent else Theme.textMuted
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Title
        Text(
            text = "follow some artists",
            fontFamily = CaveatFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.SemiBold,
            color = Theme.textPrimary
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Selected genre chips (small)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            selectedGenres.forEach { genre ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Theme.accent.copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = genre,
                        style = Theme.dmSans(11f, FontWeight.Medium),
                        color = Theme.accent
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Search field
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Theme.card)
                .border(1.dp, Theme.divider, RoundedCornerShape(12.dp))
                .padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = Theme.textMuted,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = onSearchQueryChange,
                    textStyle = Theme.dmSans(14f).copy(color = Theme.textPrimary),
                    singleLine = true,
                    cursorBrush = SolidColor(Theme.accent),
                    modifier = Modifier.weight(1f),
                    decorationBox = { innerTextField ->
                        Box {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    "Search artists...",
                                    style = Theme.dmSans(14f),
                                    color = Theme.textMuted
                                )
                            }
                            innerTextField()
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Artist list
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            items(filteredArtists, key = { it.first }) { (artist, _) ->
                ArtistRow(
                    name = artist,
                    isFollowed = isArtistFollowed(artist),
                    onToggle = { onToggleArtist(artist) }
                )
            }

            if (filteredArtists.isEmpty() && searchQuery.isNotBlank()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No artists found",
                            style = Theme.dmSans(14f),
                            color = Theme.textMuted
                        )
                    }
                }
            }
        }

        // Done button when artists are followed
        if (followCount > 0) {
            Button(
                onClick = onDone,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Theme.accent,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Done", style = Theme.dmSans(16f, FontWeight.Medium))
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ArtistRow(
    name: String,
    isFollowed: Boolean,
    onToggle: () -> Unit
) {
    val buttonBg by animateColorAsState(
        targetValue = if (isFollowed) Theme.accent.copy(alpha = 0.12f) else Theme.accent,
        animationSpec = tween(200),
        label = "artist_btn_bg"
    )
    val buttonTextColor by animateColorAsState(
        targetValue = if (isFollowed) Theme.accent else Color.White,
        animationSpec = tween(200),
        label = "artist_btn_text"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Artist initial avatar
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(Theme.accent.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.first().uppercase(),
                fontFamily = DmSansFamily,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Theme.accent
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Artist name
        Text(
            text = name,
            style = Theme.dmSans(15f, FontWeight.Medium),
            color = Theme.textPrimary,
            modifier = Modifier.weight(1f)
        )

        // Follow / Following button
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(buttonBg)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onToggle
                )
                .padding(horizontal = 14.dp, vertical = 7.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isFollowed) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = Theme.accent,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                }
                Text(
                    text = if (isFollowed) "Following" else "Follow",
                    fontFamily = DmSansFamily,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = buttonTextColor
                )
            }
        }
    }
}
