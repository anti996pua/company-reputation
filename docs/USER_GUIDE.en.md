# User Guide

> Author: Product Manager
> Version: v1.0

## What is Company Reputation Checker?

Company Reputation Checker is a convenient corporate review platform. Want to know the real working conditions at a company? Overtime? Benefits? Company culture? Find answers here.

## Quick Start

### 1. Search for a Company

Enter a company name in the search box on the homepage:

- Type "ByteDance", "Huawei", "Tencent", etc.
- Search suggestions appear automatically as you type
- Click a suggestion to jump directly, or press Enter to see all results

### 2. View Search Results

Search results show each company's:
- **Name** and **description**
- **Overall rating** and **review count**
- **City**, **company size**, and **industry**

Results are sorted by relevance.

### 3. Browse Company Details

Click any company to view its detail page:

#### 🏢 Basic Information
- Full name, English name, industry
- City, company size
- Year founded, official website
- Company description

#### ⭐ Overall Rating
The large circle in the top-right corner shows the overall rating (out of 5).

#### 📊 Eight Key Metrics

| Metric | Description | Higher score means... |
|---|---|---|
| Work Intensity | Task density and pressure | More intense |
| Overtime Frequency | Overtime frequency | More overtime |
| Salary Level | Compensation competitiveness | Higher pay |
| Benefits | Benefits package quality | Better benefits |
| Work-Life Balance | Work/personal life boundaries | Better balance |
| Career Growth | Promotion and growth opportunities | Better development |
| Work Environment | Office conditions and atmosphere | Better environment |
| Company Culture | Values and cultural atmosphere | Better culture |

#### ⚠️ 996 Warning
If a company is flagged as having a 996 work schedule, a yellow warning bar will appear.

#### 📝 Detailed Descriptions
- **Overtime**: Daily hours, weekend frequency
- **Benefits**: Salary structure, allowances, insurance
- **Culture**: Internal atmosphere, management style
- **Pros and Cons**: Employee perspective

### 4. Join the Discussion

In the comments section at the bottom, you can:

- Log in with your GitHub account (via Giscus)
- Share your thoughts about the company
- Reply to others
- React to comments

## How to Add or Edit Company Data

This project uses **Markdown files** to store company data. To add a new company or edit existing data:

### For Users (via GitHub)

1. Go to the `companies/` directory in the repository
2. Create a new `.md` file or edit an existing one
3. Follow the format below
4. Submit a Pull Request

### Markdown Format

```markdown
Company Name
===

Brief company description here.

## Basic Info

- English Name: ByteDance
- Alias: ByteDance, TikTok
- City: Beijing
- Size: 10000+ employees
- Founded: 2012
- Industry: Internet/Technology
- Website: https://www.example.com

## Work Intensity

Score: 4.5/5

## Overtime Frequency

Score: 4.2/5

## Is 996

Yes

## Salary Level

Score: 4.8/5

## Benefits Score

Score: 4.0/5

## Overtime

Description text...

## Pros

Pros text...

## Cons

Cons text...
```

### Score Rules

- Each metric uses a **0-5 scale** (0=worst, 5=best)
- For "Is 996", use "Yes" or "No"
- Metric sections with scores must include `Score: X.X/5` on the first line
- Description sections (Overtime, Benefits, Culture, Pros, Cons) are plain text

### For Local Development

```bash
# 1. Edit or create a file in companies/
vim companies/公司名称.md

# 2. Rebuild the static site
npm run build

# 3. Preview
cd dist && python3 -m http.server 8080
```

## FAQ

### Q: Where does the data come from?
Data is contributed by users voluntarily. For reference only.

### Q: How to report incorrect information?
Report in GitHub Issues or leave a comment in the discussion area.

### Q: How is the overall rating calculated?
Overall = (Salary + Benefits + WLB + Career + Environment + Culture) ÷ 6

### Q: Why do some companies not have a rating?
Newly added companies or those with incomplete data may not have a rating yet.

## Tips

1. **Multiple sources**: Don't rely solely on scores; read the detailed descriptions
2. **Timeliness**: Company conditions may change over time
3. **Objectivity**: Different employees have different experiences
4. **Contribute**: If you know a company, share your experience in the comments

## Disclaimer

Information provided is for reference only and does not constitute employment advice. Users should make their own judgments.

## Contact

For questions or suggestions, please submit feedback via GitHub Issues.
