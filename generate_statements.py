import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import random
from datetime import datetime, timedelta

def generate_transactions(month, year, is_march=False):
    txns = []
    
    # Starting balance
    balance = 250000.0 if month == 1 else (280000.0 if month == 2 else 310000.0)
    
    # 5th: Salary
    date_str = f"05/{month:02d}/{year}"
    amount = 120000.0
    balance += amount
    txns.append([date_str, date_str, "", "NEFT-IN/SALARY CORP/TCS LTD/EMP8291", "", f"{amount:.2f}", f"{balance:.2f}"])
    
    # 10th: EMIs and SIPs
    date_str = f"10/{month:02d}/{year}"
    
    amount = 35000.0
    balance -= amount
    txns.append([date_str, date_str, "", "ACH/DR/HDFC BANK LTD/HOME LOAN", f"{amount:.2f}", "", f"{balance:.2f}"])
    
    amount = 15000.0
    balance -= amount
    txns.append([date_str, date_str, "", "UPI/DR/310192837192/ZERODHA BROKING/zerodha@hdfcbank", f"{amount:.2f}", "", f"{balance:.2f}"])

    amount = 5000.0
    balance -= amount
    txns.append([date_str, date_str, "", "UPI/DR/310193847192/GROWW INVEST/groww@icici", f"{amount:.2f}", "", f"{balance:.2f}"])
    
    amount = 499.0
    balance -= amount
    txns.append([date_str, date_str, "", "POS/DR/NETFLIX.COM/MUMBAI", f"{amount:.2f}", "", f"{balance:.2f}"])
    
    amount = 119.0
    balance -= amount
    txns.append([date_str, date_str, "", "POS/DR/SPOTIFY INDIA/MUMBAI", f"{amount:.2f}", "", f"{balance:.2f}"])
    
    # Routine daily expenses
    for day in range(1, 28):
        date_str = f"{day:02d}/{month:02d}/{year}"
        
        # Chai/Coffee
        if random.random() > 0.3:
            amount = random.choice([20.0, 50.0, 120.0])
            balance -= amount
            txns.append([date_str, date_str, "", f"UPI/DR/3{random.randint(10000000000,99999999999)}/CHAI POINT/q{random.randint(1000,9999)}@ybl", f"{amount:.2f}", "", f"{balance:.2f}"])
            
        # Uber (weekly approx)
        if day % 5 == 0:
            amount = random.uniform(150.0, 450.0)
            balance -= amount
            txns.append([date_str, date_str, "", f"UPI/DR/3{random.randint(10000000000,99999999999)}/UBER INDIA SYS/uber@hdfcbank", f"{amount:.2f}", "", f"{balance:.2f}"])
            
        # Swiggy/Zomato (every few days)
        if day % 4 == 0:
            amount = random.uniform(300.0, 800.0)
            balance -= amount
            merch = random.choice(["ZOMATO LTD/zomato@hdfcbank", "SWIGGY/swiggyupi@axisbank"])
            txns.append([date_str, date_str, "", f"UPI/DR/3{random.randint(10000000000,99999999999)}/{merch}", f"{amount:.2f}", "", f"{balance:.2f}"])
            
        # Amazon/Blinkit
        if day % 7 == 0:
            amount = random.uniform(500.0, 2500.0)
            balance -= amount
            merch = random.choice(["AMAZON PAY INDIA/BENGALURU", "BLINKIT INDIA/GURGAON", "FLIPKART INTERNET/BENGALURU"])
            txns.append([date_str, date_str, "", f"POS/DR/{merch}", f"{amount:.2f}", "", f"{balance:.2f}"])

    # INJECT ANOMALIES FOR MARCH
    if is_march:
        # Huge sketchy wire transfer on 18th
        date_str = f"18/03/{year}"
        amount = 85000.0
        balance -= amount
        txns.append([date_str, date_str, "", "IMPS/DR/92837192837/WAZIRX CRYPTO/MUMBAI", f"{amount:.2f}", "", f"{balance:.2f}"])
        
        # Sketchy duplicated charges (Classic iTunes/Apple card scam)
        date_str = f"22/03/{year}"
        amount = 14500.0
        balance -= amount
        txns.append([date_str, date_str, "", "POS/DR/APPLE.COM/BILL/ITUNES.COM/IRL", f"{amount:.2f}", "", f"{balance:.2f}"])
        balance -= amount
        txns.append([date_str, date_str, "", "POS/DR/APPLE.COM/BILL/ITUNES.COM/IRL", f"{amount:.2f}", "", f"{balance:.2f}"])
        
    return txns

def create_pdf(month_name, month_num, year, is_march):
    filename = f"{month_name}_{year}_Statement.pdf"
    doc = SimpleDocTemplate(filename, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Fake Header
    header = Paragraph(f"<b>Bandhan Bank</b><br/><br/><b>Customer Name:</b> ARJUN SHARMA<br/><b>Account Number:</b> 50220023977902<br/><b>Statement of Account for the month of {month_name}, {year}</b>", styles['Normal'])
    elements.append(header)
    elements.append(Spacer(1, 20))
    
    # Table Data
    data = [["Date", "Effective Date", "Cheque/Reference No", "Transaction Detail", "Debit", "Credit", "Balance"]]
    txns = generate_transactions(month_num, year, is_march)
    
    # Sort transactions by day
    txns.sort(key=lambda x: int(x[0].split('/')[0]))
    
    data.extend(txns)
    
    # Create Table
    t = Table(data, colWidths=[60, 60, 60, 160, 50, 50, 60])
    
    # Add Style exactly like Bandhan
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey) # Added faint grid for readability
    ])
    t.setStyle(style)
    elements.append(t)
    
    doc.build(elements)
    print(f"Generated {filename} successfully.")

if __name__ == "__main__":
    create_pdf("January", 1, 2026, False)
    create_pdf("February", 2, 2026, False)
    create_pdf("March", 3, 2026, True)
