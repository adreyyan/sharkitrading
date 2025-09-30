import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, limit, doc, updateDoc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('address')

    if (!userAddress) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()
    
    // Fetch from Firebase using the same approach as admin
    console.log('Fetching trades from Firebase for:', normalizedAddress)
    const tradesRef = collection(db, 'trades')
    
    // Query for trades where user is either creator or responder
    // First get trades where user is creator (no limit to ensure we get all)
    const creatorQuery = query(
      tradesRef,
      where('from', '==', normalizedAddress)
    )
    
    // Then get trades where user is responder  
    const responderQuery = query(
      tradesRef,
      where('to', '==', normalizedAddress)
    )

    // Execute both queries
    const [creatorSnapshot, responderSnapshot] = await Promise.all([
      getDocs(creatorQuery),
      getDocs(responderQuery)
    ])
    
    // Combine results and remove duplicates
    const allTrades = new Map()
    
    creatorSnapshot.docs.forEach(doc => {
      allTrades.set(doc.id, {
        id: doc.id,
        ...doc.data(),
        source: 'firebase',
        userRole: 'creator'
      })
    })
    
    responderSnapshot.docs.forEach(doc => {
      if (!allTrades.has(doc.id)) {
        allTrades.set(doc.id, {
          id: doc.id,
          ...doc.data(),
          source: 'firebase',
          userRole: 'responder'
        })
      }
    })
    
    const trades = Array.from(allTrades.values())

    // Sort by priority: active/pending trades first, then by createdAt descending
    trades.sort((a, b) => {
      // Priority 1: Active/pending trades first
      const aIsActive = ['pending', 'active'].includes(a.status)
      const bIsActive = ['pending', 'active'].includes(b.status)
      
      if (aIsActive && !bIsActive) return -1
      if (!aIsActive && bIsActive) return 1
      
      // Priority 2: Sort by createdAt descending (newest first)
      const getTimestamp = (date: any) => {
        if (!date) return 0
        if (date.seconds) return date.seconds * 1000
        if (date.toDate) return date.toDate().getTime()
        if (date instanceof Date) return date.getTime()
        return 0
      }
      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
    })

    // Limit to first 50 trades to avoid performance issues
    const limitedTrades = trades.slice(0, 50)

    console.log(`Found ${trades.length} total trades for user ${normalizedAddress}`)
    console.log(`Creator trades: ${creatorSnapshot.docs.length}, Responder trades: ${responderSnapshot.docs.length}`)
    console.log(`Returning ${limitedTrades.length} trades (limited for performance)`)
    
    // Debug: Log trade details for first 10 trades
    limitedTrades.slice(0, 10).forEach((trade, index) => {
      console.log(`Trade ${index + 1}: ID=${trade.id}, Status=${trade.status}, Role=${trade.userRole}, From=${trade.from}, To=${trade.to}, CreatedAt=${trade.createdAt?.seconds || 'unknown'}`)
    })
    
    return NextResponse.json({
      trades: limitedTrades,
      totalFound: trades.length,
      success: true
    })

  } catch (error) {
    console.error('Error fetching user trades:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch trades',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tradeId, userAddress } = await request.json()

    if (!tradeId || !userAddress) {
      return NextResponse.json({ 
        error: 'Trade ID and user address required' 
      }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()
    
    console.log('🗑️ Cancelling trade:', tradeId, 'for user:', normalizedAddress)

    // Get the trade document
    const tradeRef = doc(db, 'trades', tradeId)
    const tradeDoc = await getDoc(tradeRef)

    if (!tradeDoc.exists()) {
      return NextResponse.json({ 
        error: 'Trade not found' 
      }, { status: 404 })
    }

    const tradeData = tradeDoc.data()
    const tradeFrom = tradeData.from?.toLowerCase()
    const tradeTo = tradeData.to?.toLowerCase()

    // Check if user has permission to cancel this trade
    if (tradeFrom !== normalizedAddress && tradeTo !== normalizedAddress) {
      return NextResponse.json({ 
        error: 'You do not have permission to cancel this trade' 
      }, { status: 403 })
    }

    // Check if trade is already cancelled or completed
    if (tradeData.status && !['pending', 'active'].includes(tradeData.status.toLowerCase())) {
      return NextResponse.json({ 
        error: `Trade is already ${tradeData.status}` 
      }, { status: 400 })
    }

    // Determine the new status based on user role
    let newStatus: string
    let actionType: string

    if (tradeFrom === normalizedAddress) {
      // User is the creator - they're cancelling their own trade
      newStatus = 'cancelled'
      actionType = 'cancelled'
    } else {
      // User is the responder - they're declining the trade
      newStatus = 'declined'
      actionType = 'declined'
    }

    // Update the trade status
    await updateDoc(tradeRef, {
      status: newStatus,
      updatedAt: new Date(),
      [`${actionType}At`]: new Date(),
      [`${actionType}By`]: normalizedAddress
    })

    console.log(`✅ Trade ${tradeId} ${actionType} by ${normalizedAddress}`)

    return NextResponse.json({
      success: true,
      message: `Trade ${actionType} successfully`,
      tradeId: tradeId,
      newStatus: newStatus
    })

  } catch (error) {
    console.error('❌ Error cancelling trade:', error)
    return NextResponse.json({ 
      error: 'Failed to cancel trade',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}