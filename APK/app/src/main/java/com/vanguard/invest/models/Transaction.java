package com.vanguard.invest.models;

public class Transaction {
    public String id;
    public String type; // deposit, withdrawal, investment, profit, bonus
    public double amount;
    public String status; // pending, completed, failed
    public String timestamp;
}
