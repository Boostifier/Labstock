import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { nom, mot_de_passe } = await request.json()

    if (!nom || !mot_de_passe) {
      return NextResponse.json({ error: 'Identifiants manquants' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('nom', nom)
      .single()

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: `DB: ${error.message}` }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    const sessionUser = {
      id: user.id,
      nom: user.nom,
      droit_parametres: user.droit_parametres,
      droit_marchandises: user.droit_marchandises,
      droit_facturation: user.droit_facturation,
      droit_operations: user.droit_operations,
      droit_inventaire: user.droit_inventaire,
      droit_demande_achat: user.droit_demande_achat,
      droit_bon_commande: user.droit_bon_commande,
      droit_satisfaction_f: user.droit_satisfaction_f,
      droit_stock_bord: user.droit_stock_bord,
      droit_factures_bord: user.droit_factures_bord,
      is_system: user.is_system,
    }

    const token = await createSession(sessionUser)
    const response = NextResponse.json({ success: true, user: sessionUser })
    response.cookies.set('labstock_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
