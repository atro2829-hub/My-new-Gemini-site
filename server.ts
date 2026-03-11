import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { adminAuth, adminDb } from "./firebase-admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper for admin notifications
async function notifyAdmin(subject: string, message: string) {
  const settingDoc = await adminDb.collection('settings').doc('admin_email').get();
  const adminEmail = settingDoc.exists ? settingDoc.data()?.value : 'atro2829@gmail.com';
  console.log(`[ADMIN NOTIFICATION to ${adminEmail}]: ${subject} - ${message}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  app.get("/api/settings", async (req, res) => {
    try {
      const settingsSnapshot = await adminDb.collection('settings').get();
      const result: any = {};
      settingsSnapshot.forEach(doc => {
        result[doc.id] = doc.data().value;
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/plans", async (req, res) => {
    try {
      const plansSnapshot = await adminDb.collection('investment_plans').get();
      const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, referralCode } = req.body;
    const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const isAdmin = email.toLowerCase() === 'atro2829@gmail.com';
    
    try {
      // 1. Create user in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: email.split('@')[0],
      });

      // Set custom claims for admin
      if (isAdmin) {
        await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });
      }

      // 2. Create profile in Firestore
      const profile = {
        id: userRecord.uid,
        email,
        balance: 0,
        referral_code: myReferralCode,
        referred_by: referralCode || null,
        is_admin: isAdmin,
        created_at: new Date().toISOString()
      };

      await adminDb.collection('users').doc(userRecord.uid).set(profile);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login is handled client-side with Firebase SDK, 
  // but we might need a profile fetcher
  app.post("/api/auth/login", async (req, res) => {
    const { idToken } = req.body;
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const userDoc = await adminDb.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        res.json(userDoc.data());
      } else {
        res.status(404).json({ error: "User profile not found" });
      }
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const uid = req.params.id;
      const userDoc = await adminDb.collection('users').doc(uid).get();

      if (userDoc.exists) {
        const user = userDoc.data();
        
        const activePlansSnapshot = await adminDb.collection('active_plans').where('user_id', '==', uid).get();
        const activePlans = activePlansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const transactionsSnapshot = await adminDb.collection('transactions')
          .where('user_id', '==', uid)
          .orderBy('timestamp', 'desc')
          .limit(10)
          .get();
        const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const referralsSnapshot = await adminDb.collection('users').where('referred_by', '==', user?.referral_code).get();

        res.json({ ...user, activePlans, transactions, referrals: referralsSnapshot.size });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deposit", async (req, res) => {
    const { userId, amount } = req.body;
    try {
      const userRef = adminDb.collection('users').doc(userId);
      await adminDb.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const newBalance = (doc.data()?.balance || 0) + Number(amount);
        t.update(userRef, { balance: newBalance });
        
        const txRef = adminDb.collection('transactions').doc();
        t.set(txRef, {
          user_id: userId,
          type: 'deposit',
          amount: Number(amount),
          status: 'completed',
          timestamp: new Date().toISOString()
        });
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/withdraw", async (req, res) => {
    const { userId, amount } = req.body;
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const success = await adminDb.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const data = doc.data();
        if (data && data.balance >= amount) {
          const newBalance = data.balance - amount;
          t.update(userRef, { balance: newBalance });
          
          const txRef = adminDb.collection('transactions').doc();
          t.set(txRef, {
            user_id: userId,
            type: 'withdrawal',
            amount: Number(amount),
            status: 'pending',
            timestamp: new Date().toISOString()
          });
          return true;
        }
        return false;
      });

      if (success) {
        const userDoc = await userRef.get();
        await notifyAdmin("Withdrawal Requested", `User ${userDoc.data()?.email} requested a withdrawal of $${amount}`);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Insufficient balance" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/invest", async (req, res) => {
    const { userId, planName, amount, profitRate, durationDays } = req.body;
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const success = await adminDb.runTransaction(async (t) => {
        const doc = await t.get(userRef);
        const data = doc.data();
        if (data && data.balance >= amount) {
          const newBalance = data.balance - amount;
          t.update(userRef, { balance: newBalance });
          
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + durationDays);
          
          const planRef = adminDb.collection('active_plans').doc();
          t.set(planRef, {
            user_id: userId,
            plan_name: planName,
            amount: Number(amount),
            profit_rate: profitRate,
            duration_days: durationDays,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString()
          });
          
          const txRef = adminDb.collection('transactions').doc();
          t.set(txRef, {
            user_id: userId,
            type: 'investment',
            amount: Number(amount),
            status: 'completed',
            timestamp: new Date().toISOString()
          });
          return true;
        }
        return false;
      });

      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Insufficient balance" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Admin Routes ---

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const usersSnapshot = await adminDb.collection('users').get();
      const totalUsers = usersSnapshot.size;
      
      const txSnapshot = await adminDb.collection('transactions').get();
      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let pendingWithdrawals = 0;
      
      txSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'deposit') totalDeposits += data.amount;
        if (data.type === 'withdrawal') {
          totalWithdrawals += data.amount;
          if (data.status === 'pending') pendingWithdrawals++;
        }
      });
      
      res.json({ totalUsers, totalDeposits, totalWithdrawals, pendingWithdrawals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/transactions", async (req, res) => {
    try {
      const txSnapshot = await adminDb.collection('transactions').orderBy('timestamp', 'desc').get();
      const txs = await Promise.all(txSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await adminDb.collection('users').doc(data.user_id).get();
        return {
          id: doc.id,
          ...data,
          email: userDoc.data()?.email
        };
      }));
      res.json(txs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/transactions/:id/status", async (req, res) => {
    const { status } = req.body;
    const txId = req.params.id;
    
    try {
      const txRef = adminDb.collection('transactions').doc(txId);
      const txDoc = await txRef.get();
      const tx = txDoc.data();
      
      if (tx && tx.status === 'pending' && status === 'failed') {
        const userRef = adminDb.collection('users').doc(tx.user_id);
        await adminDb.runTransaction(async (t) => {
          const uDoc = await t.get(userRef);
          const newBalance = (uDoc.data()?.balance || 0) + tx.amount;
          t.update(userRef, { balance: newBalance });
          t.update(txRef, { status });
        });
      } else {
        await txRef.update({ status });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const usersSnapshot = await adminDb.collection('users').orderBy('created_at', 'desc').get();
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/balance", async (req, res) => {
    const { balance } = req.body;
    try {
      await adminDb.collection('users').doc(req.params.id).update({ balance });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      await adminAuth.deleteUser(req.params.id);
      await adminDb.collection('users').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    const { key, value } = req.body;
    try {
      await adminDb.collection('settings').doc(key).set({ value });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/plans", async (req, res) => {
    const { id, name, min_investment, duration_days, profit_percentage, color } = req.body;
    try {
      await adminDb.collection('investment_plans').doc(id).set({ name, min_investment, duration_days, profit_percentage, color });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/plans/:id", async (req, res) => {
    try {
      await adminDb.collection('investment_plans').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
