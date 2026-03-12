package com.vanguard.invest.models;

import java.util.List;

public class User {
    public String id;
    public String email;
    public double balance;
    public String referral_code;
    public int referrals;
    public boolean is_admin;
    public List<ActivePlan> activePlans;
    public List<Transaction> transactions;
}
