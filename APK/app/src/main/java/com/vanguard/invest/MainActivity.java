package com.vanguard.invest;

import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.gson.Gson;
import com.vanguard.invest.models.User;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private User currentUser;
    private TextView balanceText;
    private TextView investedText;
    private TextView profitText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        balanceText = findViewById(R.id.balance_text);
        investedText = findViewById(R.id.invested_text);
        profitText = findViewById(R.id.profit_text);

        loadUserData();
        updateUI();
    }

    private void loadUserData() {
        String json = null;
        try {
            InputStream is = getAssets().open("data.json");
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            json = new String(buffer, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            ex.printStackTrace();
            return;
        }

        Gson gson = new Gson();
        currentUser = gson.fromJson(json, User.class);
    }

    private void updateUI() {
        if (currentUser != null) {
            balanceText.setText("$" + String.format("%.2f", currentUser.balance));
            
            double totalInvested = 0;
            for (com.vanguard.invest.models.ActivePlan plan : currentUser.activePlans) {
                totalInvested += plan.amount;
            }
            investedText.setText("$" + String.format("%.2f", totalInvested));

            double totalProfit = 0;
            for (com.vanguard.invest.models.Transaction tx : currentUser.transactions) {
                if ("profit".equals(tx.type)) {
                    totalProfit += tx.amount;
                }
            }
            profitText.setText("+$" + String.format("%.2f", totalProfit));
        }
    }
}
