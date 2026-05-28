package com.pae.api_service.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import java.util.Map;

@DynamoDbBean
public class SummaryMetrics {
    private Integer totalIncome;
    private Integer totalExpense;
    private Integer totalRecurringExpense;
    private Integer anomaliesCount;
    private String financialHealth;
    private String highestCategory;
    private Map<String, Integer> categoryBreakdown;
    
    // Feature 7: Cashflow Forecaster
    private Integer predictedBurnRate;
    private Integer predictedDiscretionaryIncome;

    public SummaryMetrics() {}

    public Integer getPredictedBurnRate() { return predictedBurnRate; }
    public void setPredictedBurnRate(Integer predictedBurnRate) { this.predictedBurnRate = predictedBurnRate; }

    public Integer getPredictedDiscretionaryIncome() { return predictedDiscretionaryIncome; }
    public void setPredictedDiscretionaryIncome(Integer predictedDiscretionaryIncome) { this.predictedDiscretionaryIncome = predictedDiscretionaryIncome; }

    public Integer getTotalIncome() { return totalIncome; }
    public void setTotalIncome(Integer totalIncome) { this.totalIncome = totalIncome; }

    public Integer getTotalExpense() { return totalExpense; }
    public void setTotalExpense(Integer totalExpense) { this.totalExpense = totalExpense; }

    public Integer getTotalRecurringExpense() { return totalRecurringExpense; }
    public void setTotalRecurringExpense(Integer totalRecurringExpense) { this.totalRecurringExpense = totalRecurringExpense; }

    public Integer getAnomaliesCount() { return anomaliesCount; }
    public void setAnomaliesCount(Integer anomaliesCount) { this.anomaliesCount = anomaliesCount; }

    public String getFinancialHealth() { return financialHealth; }
    public void setFinancialHealth(String financialHealth) { this.financialHealth = financialHealth; }

    public String getHighestCategory() { return highestCategory; }
    public void setHighestCategory(String highestCategory) { this.highestCategory = highestCategory; }

    public Map<String, Integer> getCategoryBreakdown() { return categoryBreakdown; }
    public void setCategoryBreakdown(Map<String, Integer> categoryBreakdown) { this.categoryBreakdown = categoryBreakdown; }
}
