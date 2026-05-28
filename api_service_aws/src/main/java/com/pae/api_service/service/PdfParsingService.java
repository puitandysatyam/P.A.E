package com.pae.api_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pae.api_service.model.Transaction;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.*;
import software.amazon.awssdk.services.textract.TextractClient;
import software.amazon.awssdk.services.textract.model.DetectDocumentTextRequest;
import software.amazon.awssdk.services.textract.model.DetectDocumentTextResponse;
import software.amazon.awssdk.services.textract.model.Document;
import software.amazon.awssdk.services.textract.model.Block;
import software.amazon.awssdk.core.SdkBytes;

import java.util.*;
import java.util.regex.Pattern;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

@Service
public class PdfParsingService {

    private static final Pattern ACCOUNT_NUM_PATTERN = Pattern.compile("\\b\\d{5,14}(\\d{4})\\b");

    public PdfParsingService() {
    }

    public String parseAndSanitize(byte[] fileBytes) throws Exception {
        System.out.println("🚀 [Smart Routing] Attempting local OCR via Apache PDFBox...");
        String extractedPdfText = "";
        
        try (PDDocument pdfDocument = Loader.loadPDF(fileBytes)) {
            PDFTextStripper pdfStripper = new PDFTextStripper();
            extractedPdfText = pdfStripper.getText(pdfDocument);
        } catch (Exception e) {
            System.out.println("⚠️ [Smart Routing] PDFBox failed to parse document. Falling back to AWS Textract.");
        }

        if (extractedPdfText != null && !extractedPdfText.trim().isEmpty()) {
            System.out.println("✅ [Smart Routing] Success! PDFBox extracted text in milliseconds ($0 Cost).");
            return extractedPdfText;
        }

        // Fallback to AWS Textract for scanned images
        System.out.println("🔄 [Smart Routing] Scanned Image Detected. Initiating AWS Textract Fallback...");
        StringBuilder textractText = new StringBuilder();
        try (TextractClient textractClient = TextractClient.builder()
                .region(Region.AP_SOUTH_1)
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build()) {
                
            Document document = Document.builder()
                    .bytes(SdkBytes.fromByteArray(fileBytes))
                    .build();
                    
            DetectDocumentTextRequest request = DetectDocumentTextRequest.builder()
                    .document(document)
                    .build();
                    
            DetectDocumentTextResponse response = textractClient.detectDocumentText(request);
            
            for (Block block : response.blocks()) {
                if ("LINE".equals(block.blockTypeAsString())) {
                    textractText.append(block.text()).append("\n");
                }
            }
        }

        if (textractText == null || textractText.toString().trim().isEmpty()) {
            throw new IllegalArgumentException("Could not extract text from PDF via PDFBox or AWS Textract.");
        }

        System.out.println("✅ [Smart Routing] AWS Textract successfully extracted text from image.");
        return textractText.toString();
    }
    private String sanitizeNarration(String narration) {
        return ACCOUNT_NUM_PATTERN.matcher(narration).replaceAll("****$1");
    }
}
