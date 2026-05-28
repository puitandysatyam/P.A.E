package com.pae.api_service.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbIgnore;

import java.util.List;
import java.util.Map;

@DynamoDbBean
public class StatementDocument {
    private String id;
    private String userId;
    private String status;
    private String statementMonth;
    private SummaryMetrics summaryMetrics;
    private List<Transaction> transactions;
    private String aiSummary;
    private String rawText;
    private String subscriptionTier = "FREE";
    private Map<String, String> adPayload;

    public StatementDocument() {}

    public Map<String, String> getAdPayload() { return adPayload; }
    public void setAdPayload(Map<String, String> adPayload) { this.adPayload = adPayload; }

    public String getSubscriptionTier() { return subscriptionTier; }
    public void setSubscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; }

    public String getRawText() { return rawText; }
    public void setRawText(String rawText) { this.rawText = rawText; }

    public String getAiSummary() { return aiSummary; }
    public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }

    @DynamoDbPartitionKey
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStatementMonth() { return statementMonth; }
    public void setStatementMonth(String statementMonth) { this.statementMonth = statementMonth; }

    public SummaryMetrics getSummaryMetrics() { return summaryMetrics; }
    public void setSummaryMetrics(SummaryMetrics summaryMetrics) { this.summaryMetrics = summaryMetrics; }

    public List<Transaction> getTransactions() { return transactions; }
    public void setTransactions(List<Transaction> transactions) { this.transactions = transactions; }

    @DynamoDbIgnore
    public List<Transaction> getAnomalousTransactions() {
        if (transactions == null) return null;
        return transactions.stream()
                .filter(t -> t.getMlData() != null && Boolean.TRUE.equals(t.getMlData().getIsAnomaly()))
                .toList();
    }

    @DynamoDbIgnore
    public List<Transaction> getRecurringTransactions() {
        if (transactions == null) return null;
        return transactions.stream()
                .filter(t -> t.getMlData() != null && Boolean.TRUE.equals(t.getMlData().getIsRecurring()))
                .toList();
    }

    @DynamoDbIgnore
    public Map<String, List<Transaction>> getExpenseBreakdownTransactions() {
        if (transactions == null) return null;
        return transactions.stream()
                .filter(t -> t.getMlData() != null && t.getMlData().getPredictedCategory() != null)
                .collect(java.util.stream.Collectors.groupingBy(t -> t.getMlData().getPredictedCategory()));
    }
}
