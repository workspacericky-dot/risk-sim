import pandas as pd

file_path = 'excel-mode/Risk-Sim-MA.xlsx'
try:
    xl = pd.ExcelFile(file_path)
    print(f"Sheets in {file_path}: {xl.sheet_names}")
    for sheet in xl.sheet_names[:3]: # Look at first 3 sheets
        df = pd.read_excel(file_path, sheet_name=sheet).head(5)
        print(f"\n--- Sheet: {sheet} ---")
        print(df.to_string())
except Exception as e:
    print(f"Error reading excel: {e}")
