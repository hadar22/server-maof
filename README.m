# שרת מייל - מעוף מעליות

שרת Express קטן שמטפל בשליחת מיילים מטופס יצירת הקשר. מיועד להרצה ב-Render.

## מבנה

- `server.js` - השרת עצמו (Express + nodemailer)
- `package.json` - התלויות
- `.env.example` - דוגמה למשתני הסביבה הנדרשים

## העלאה ל-Render

1. העלי את תיקיית `server` הזו ל-repository נפרד ב-GitHub (או כתת-תיקייה).
2. ב-Render צרי **Web Service** חדש וחברי אותו ל-repository.
3. הגדרות הבנייה:
   - **Root Directory**: `server` (אם השרת בתת-תיקייה)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. בקטע **Environment** הוסיפי את משתני הסביבה:
   - `GMAIL_USER` - כתובת ה-Gmail שלך
   - `GMAIL_APP_PASSWORD` - סיסמת אפליקציה מ-Google (ראי למטה)
   - `NODE_ENV` - הערך `production`

## יצירת סיסמת אפליקציה ל-Gmail

הסיסמה הרגילה של Gmail לא תעבוד. צריך ליצור "סיסמת אפליקציה":

1. ודאי שאימות דו-שלבי מופעל בחשבון Google שלך.
2. היכנסי ל: https://myaccount.google.com/apppasswords
3. צרי סיסמה חדשה והעתיקי את 16 התווים.
4. הדביקי אותם ב-`GMAIL_APP_PASSWORD` ב-Render.

## בדיקה מקומית

```bash
cd server
npm install
cp .env.example .env   # ואז מלאי את הפרטים
npm start
```

השרת יעלה על http://localhost:3001

## הערה על CORS

ב-`server.js` מוגדרת רשימת כתובות מורשות (`allowedOrigins`). אם כתובת
האתר שלך שונה מ-`maof-elevators.com`, עדכני את הרשימה בהתאם.
