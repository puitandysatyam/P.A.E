package com.pae.api_service.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.beans.factory.annotation.Value;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed.origins:*}")
    private String[] allowedOrigins;

    @Autowired
    private RateLimitInterceptor rateLimitInterceptor;

    @Autowired
    private JwtAuthInterceptor jwtAuthInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 1. Security: Authenticate ALL endpoints under /api/statements
        registry.addInterceptor(jwtAuthInterceptor).addPathPatterns("/api/statements/**");
        
        // 2. Rate Limiting: Apply rate limiting specifically to the upload endpoint
        registry.addInterceptor(rateLimitInterceptor).addPathPatterns("/api/statements/upload");
    }

    @Override
    public void addCorsMappings(org.springframework.web.servlet.config.annotation.CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("https://rupeesradar.vercel.app", "http://localhost:5173", "http://localhost:3000") // Explicitly allow Vercel and local dev
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
