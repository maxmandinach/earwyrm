package com.earwyrm.app.feature.explore

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.earwyrm.app.core.design.CaveatFamily
import com.earwyrm.app.core.design.DmSansFamily
import com.earwyrm.app.core.design.Theme
import com.earwyrm.app.core.design.rememberHaptics
import kotlinx.coroutines.launch

// Genre -> artist data, matching iOS FollowDiscoveryView and InterestPickerSheet
private val genreArtists: Map<String, List<String>> = linkedMapOf(
    "Pop" to listOf("Taylor Swift", "Billie Eilish", "Olivia Rodrigo", "Dua Lipa", "Harry Styles", "Sabrina Carpenter", "Beyonc\u00e9", "Ariana Grande", "Lana Del Rey", "Charli XCX", "Chappell Roan", "Troye Sivan"),
    "Hip-Hop" to listOf("Kendrick Lamar", "Drake", "Tyler, the Creator", "Travis Scott", "J. Cole", "Kanye West", "MF DOOM", "JID", "21 Savage", "Future"),
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FollowDiscoveryScreen(
    navController: NavHostController,
    viewModel: FollowDiscoveryViewModel = hiltViewModel()
) {
    val follows by viewModel.follows.collectAsState()
    val haptics = rememberHaptics()
    val scope = rememberCoroutineScope()
    var selectedGenre by remember { mutableStateOf(allGenres.first()) }

    val artists = remember(selectedGenre) {
        genreArtists[selectedGenre].orEmpty()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Theme.background)
            .padding(top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding())
    ) {
        // Header with back button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Theme.textPrimary
                )
            }

            Text(
                text = "discover",
                fontFamily = CaveatFamily,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Theme.accent
            )
        }

        // Genre chips in a FlowRow
        FlowRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            allGenres.forEach { genre ->
                GenreChip(
                    genre = genre,
                    isSelected = genre == selectedGenre,
                    onClick = {
                        haptics.light()
                        selectedGenre = genre
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Section label
        Text(
            text = "popular artists",
            style = Theme.caveat(18f),
            color = Theme.textSecondary,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Artist list
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            items(artists, key = { it }) { artist ->
                val isFollowing = follows.any { it.filterType == "artist" && it.filterValue.equals(artist, ignoreCase = true) }

                ArtistDiscoveryRow(
                    name = artist,
                    isFollowing = isFollowing,
                    onToggle = {
                        haptics.light()
                        scope.launch {
                            viewModel.toggleFollow(artist)
                        }
                    }
                )
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
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
        label = "genre_chip_bg"
    )
    val textColor by animateColorAsState(
        targetValue = if (isSelected) Color.White else Theme.textPrimary,
        animationSpec = tween(200),
        label = "genre_chip_text"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) Theme.accent else Theme.divider,
        animationSpec = tween(200),
        label = "genre_chip_border"
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
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            text = genre,
            fontFamily = DmSansFamily,
            fontSize = 13.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = textColor
        )
    }
}

@Composable
private fun ArtistDiscoveryRow(
    name: String,
    isFollowing: Boolean,
    onToggle: () -> Unit
) {
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

        Text(
            text = name,
            style = Theme.dmSans(15f, FontWeight.Medium),
            color = Theme.textPrimary,
            modifier = Modifier.weight(1f)
        )

        FollowButton(
            isFollowing = isFollowing,
            onClick = onToggle
        )
    }
}
