const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

// Configuration de marked pour le rendu
marked.use({
  breaks: true,
  gfm: true
});

// Fonction pour lire et remplacer les variables dans un template
function renderTemplate(templatePath, data) {
    try {
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // Charger les templates header et footer
        const headerTemplate = fs.readFileSync('templates/header.html', 'utf8');
        const footerTemplate = fs.readFileSync('templates/footer.html', 'utf8');
        
        // Remplacer les variables simples
        template = template.replace(/\{\{title\}\}/g, data.title || '');
        template = template.replace(/\{\{content\}\}/g, data.content || '');
        template = template.replace(/\{\{date\}\}/g, data.date || '');
        template = template.replace(/\{\{excerpt\}\}/g, data.excerpt || '');
        
        // Remplacer les liens de navigation selon le contexte
        const isBlogPost = data.isBlogPost || false;
        const linkPrefix = isBlogPost ? '../' : '';
        
        let headerWithLinks = headerTemplate
            .replace(/\{\{homeLink\}\}/g, `${linkPrefix}index.html`)
            .replace(/\{\{blogLink\}\}/g, `${linkPrefix}blog.html`)
            .replace(/\{\{aboutLink\}\}/g, `${linkPrefix}about.html`)
            .replace(/\{\{contactLink\}\}/g, `${linkPrefix}contact.html`);
        
        // Gérer les conditions pour les variables optionnelles
        if (data.date) {
            template = template.replace(/\{\{#if date\}\}(.*?)\{\{\/if\}\}/gs, '$1');
        } else {
            template = template.replace(/\{\{#if date\}\}.*?\{\{\/if\}\}/gs, '');
        }
        
        if (data.excerpt) {
            template = template.replace(/\{\{#if excerpt\}\}(.*?)\{\{\/if\}\}/gs, '$1');
        } else {
            template = template.replace(/\{\{#if excerpt\}\}.*?\{\{\/if\}\}/gs, '');
        }
        
        // Gérer la classe active pour la navigation
        if (data.currentPage) {
            // Remplacer les classes active pour chaque page
            const pages = ['home', 'blog', 'about', 'faq'];
            pages.forEach(page => {
                const pattern = new RegExp(`\\{\\{#if currentPage\\}\\}\\{\\{#eq currentPage '${page}'\\}\\}active\\{\\{/eq\\}\\}\\{\\{/if\\}\\}`, 'g');
                headerWithLinks = headerWithLinks.replace(pattern, data.currentPage === page ? 'active' : '');
            });
        }
        
        // Remplacer les placeholders pour header et footer
        template = template.replace(/\{\{header\}\}/g, headerWithLinks);
        template = template.replace(/\{\{footer\}\}/g, footerTemplate);
        
        // Gérer les boucles pour les articles
        if (data.articles) {
            let articlesHtml = '';
            data.articles.forEach(article => {
                let articleTemplate = fs.readFileSync('templates/blog-list.html', 'utf8');
                
                // Remplacer les variables de l'article
                articleTemplate = articleTemplate.replace(/\{\{title\}\}/g, article.title || '');
                articleTemplate = articleTemplate.replace(/\{\{slug\}\}/g, article.slug || '');
                articleTemplate = articleTemplate.replace(/\{\{date\}\}/g, article.date || '');
                articleTemplate = articleTemplate.replace(/\{\{excerpt\}\}/g, article.excerpt || '');
                articleTemplate = articleTemplate.replace(/\{\{image\}\}/g, article.image || '');
                articleTemplate = articleTemplate.replace(/\{\{views\}\}/g, article.views || '0');
                articleTemplate = articleTemplate.replace(/\{\{comments\}\}/g, article.comments || '0');
                
                articlesHtml += articleTemplate;
            });
            
            // Remplacer la boucle dans le template principal
            template = template.replace(/\{\{#each articles\}\}(.*?)\{\{\/each\}\}/gs, articlesHtml);
        }
        
        return template;
    } catch (error) {
        console.error(`❌ Erreur lors de la lecture du template ${templatePath}:`, error.message);
        return '';
    }
}

// Fonction pour convertir markdown en HTML avec template
function convertMarkdownToHtmlWithTemplate(markdownFile, outputFile, title, currentPage = '') {
    try {
        const markdownContent = fs.readFileSync(markdownFile, 'utf8');
        const { attributes, body } = frontMatter(markdownContent);
        
        // Convertir le markdown en HTML
        const htmlContent = marked(body);
        
        // Utiliser le titre du front-matter ou le titre par défaut
        const pageTitle = attributes.title || title;
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: pageTitle,
            content: htmlContent,
            currentPage: currentPage
        });
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync(outputFile, fullHtml);
        console.log(`✅ ${markdownFile} → ${outputFile}`);
    } catch (error) {
        console.error(`❌ Erreur lors de la conversion de ${markdownFile}:`, error.message);
    }
}

// Fonction pour convertir markdown en HTML avec template spécifique aux articles de blog
function convertMarkdownToHtmlWithBlogTemplate(markdownFile, outputFile, title, currentPage = '') {
    try {
        const markdownContent = fs.readFileSync(markdownFile, 'utf8');
        const { attributes, body } = frontMatter(markdownContent);
        
        // Convertir le markdown en HTML
        const htmlContent = marked(body);
        
        // Utiliser le titre du front-matter ou le titre par défaut
        const pageTitle = attributes.title || title;
        
        // Générer le HTML complet avec le template spécifique aux articles de blog
        const fullHtml = renderTemplate('templates/blog-post.html', {
            title: pageTitle,
            content: htmlContent,
            currentPage: currentPage,
            date: attributes.date || '',
            excerpt: attributes.excerpt || '',
            isBlogPost: true
        });
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync(outputFile, fullHtml);
        console.log(`✅ ${markdownFile} → ${outputFile} (avec template blog)`);
    } catch (error) {
        console.error(`❌ Erreur lors de la conversion de ${markdownFile}:`, error.message);
    }
}

// Fonction pour créer la page blog avec liste des articles
function createBlogPage() {
    try {
        const blogDir = path.join(__dirname, 'content', 'blog');
        const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        const articles = [];
        
        blogFiles.forEach(file => {
            const filePath = path.join(blogDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { attributes } = frontMatter(content);
            
            const slug = file.replace('.md', '');
            const title = attributes.title || slug;
            const date = attributes.date || '';
            const excerpt = attributes.excerpt || '';
            
            // Images par défaut basées sur le contenu
            const defaultImages = {
                'cursor': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2NjdlZWE7c3RvcC1vcGFjaXR5OjEiLz4KPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNzY0YmEyO3N0b3Atb3BhY2l0eToxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIGQ9Ik0yMCAyMGgyNjB2ODBIMjB6IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2ZyB4PSI0MCIgeT0iNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjUpIi8+CjxwYXRoIGQ9Ik0xMCAyTDEwIDE4TTIgMTBIMThNMTAgMmw0IDRMMTAgNk0xMCAxNGw0LTRMMTAgMTIiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjgpIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+Cjx0ZXh0IHg9IjIwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iNjAwIj5DdXJzb3I8L3RleHQ+Cjwvc3ZnPgo8L3N2Zz4K',
                'css-modernes': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMzYjgyZjY7c3RvcC1vcGFjaXR5OjEiLz4KPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWYyOTM3O3N0b3Atb3BhY2l0eToxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIGQ9Ik0yMCAyMGgyNjB2ODBIMjB6IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2ZyB4PSI0MCIgeT0iNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEwIDJMMTggMTBMMTAgMThNMiAxMEgxOCIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCkiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4KPHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSI2MDAiPkNTUzwvdGV4dD4KPC9zdmc+Cjwvc3ZnPgo=',
                'premiers-pas-markdown': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmNTkzM2U7c3RvcC1vcGFjaXR5OjEiLz4KPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZGMyNjI2O3N0b3Atb3BhY2l0eToxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIGQ9Ik0yMCAyMGgyNjB2ODBIMjB6IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2ZyB4PSI0MCIgeT0iNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEwIDJMMTggMTBMMTAgMThNMiAxMEgxOCIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOCkiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4KPHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSI2MDAiPk1hcmtkb3duPC90ZXh0Pgo8L3N2Zz4KPC9zdmc+Cg=='
            };
            
            articles.push({
                slug: slug,
                title: title,
                date: date,
                excerpt: excerpt,
                image: defaultImages[slug] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2NzNhZGE7c3RvcC1vcGFjaXR5OjEiLz4KPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNTM3M2Y3O3N0b3Atb3BhY2l0eToxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIGQ9Ik0yMCAyMGgyNjB2ODBIMjB6IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2ZyB4PSI0MCIgeT0iNDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjUpIi8+CjxwYXRoIGQ9Ik0xMCAyTDEwIDE4TTIgMTBIMThNMTAgMmw0IDRMMTAgNk0xMCAxNGw0LTRMMTAgMTIiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjgpIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+Cjx0ZXh0IHg9IjIwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iNjAwIj5CbG9nPC90ZXh0Pgo8L3N2Zz4KPC9zdmc+Cg==',
                views: Math.floor(Math.random() * 100) + 20,
                comments: Math.floor(Math.random() * 10)
            });
        });
        
        // Générer le HTML de la liste des articles
        let blogListHtml = fs.readFileSync('templates/blog-list.html', 'utf8');
        
        // Remplacer les variables des articles
        let articlesHtml = '';
        articles.forEach(article => {
            articlesHtml += `
                <article class="blog-card">
                    <div class="blog-card-image">
                        <img src="${article.image}" alt="${article.title}" class="card-image">
                        <div class="card-overlay">
                            <span class="read-more">Lire l'article</span>
                        </div>
                    </div>
                    <div class="blog-card-content">
                        <h2 class="card-title">
                            <a href="blog/${article.slug}.html">${article.title}</a>
                        </h2>
                        <div class="card-meta">
                            <span class="author">PAR DÉVELOPPEUR</span>
                            <span class="date">${article.date}</span>
                        </div>
                        <div class="card-stats">
                            <span class="views">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                ${article.views} vues
                            </span>
                            <span class="comments">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                ${article.comments} commentaires
                            </span>
                        </div>
                        ${article.excerpt ? `<p class="card-excerpt">${article.excerpt}</p>` : ''}
                    </div>
                </article>
            `;
        });
        
        // Remplacer la boucle dans le template
        blogListHtml = blogListHtml.replace(/\{\{#each articles\}\}(.*?)\{\{\/each\}\}/gs, articlesHtml);
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: 'Blog',
            content: blogListHtml,
            currentPage: 'blog'
        });
        
        fs.writeFileSync('dist/blog.html', fullHtml);
        console.log('✅ Page blog créée');
    } catch (error) {
        console.error('❌ Erreur lors de la création de la page blog:', error.message);
    }
}

// Fonction pour traiter index.html avec le template
function processIndexHtml() {
    try {
        // Lire le contenu du fichier index.html
        const content = fs.readFileSync('index.html', 'utf8');
        
        // Extraire seulement le contenu du body
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1].trim() : content;
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: 'Accueil - Mon Blog',
            content: bodyContent,
            currentPage: 'home'
        });
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync('dist/index.html', fullHtml);
        console.log('✅ index.html traité avec le template → dist/index.html');
    } catch (error) {
        console.error('❌ Erreur lors du traitement de index.html:', error.message);
    }
}

// Fonction pour copier les assets
function copyAssets() {
    try {
        // Copier le fichier CSS
        if (fs.existsSync('assets/style.css')) {
            fs.copyFileSync('assets/style.css', 'dist/assets/style.css');
            console.log('✅ assets/style.css copié vers dist/assets/style.css');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la copie des assets:', error.message);
    }
}

// Fonction principale de build
function build() {
    console.log('🚀 Début du build...');
    
    // Créer les dossiers nécessaires
    const dirs = ['dist', 'dist/blog', 'dist/assets', 'content', 'content/blog', 'templates'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Traiter index.html avec le template
    processIndexHtml();
    
    // Convertir les pages principales (sauf index.html qui est traité séparément)
    const pages = [
        { input: 'content/about.md', output: 'dist/about.html', title: 'À propos', currentPage: 'about', useTemplate: true },
        { input: 'content/faq.md', output: 'dist/faq.html', title: 'FAQ', currentPage: 'faq', useTemplate: true }
    ];
    
    pages.forEach(page => {
        if (fs.existsSync(page.input)) {
            if (page.useTemplate) {
                convertMarkdownToHtmlWithTemplate(page.input, page.output, page.title, page.currentPage);
            } else {
                convertMarkdownToHtmlDirect(page.input, page.output, page.title, page.currentPage);
            }
        }
    });
    
    // Créer la page blog
    createBlogPage();
    
    // Convertir les articles de blog avec le template spécifique
    const blogDir = path.join(__dirname, 'content', 'blog');
    if (fs.existsSync(blogDir)) {
        const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        blogFiles.forEach(file => {
            const slug = file.replace('.md', '');
            const inputPath = path.join(blogDir, file);
            const outputPath = `dist/blog/${slug}.html`;
            
            convertMarkdownToHtmlWithBlogTemplate(inputPath, outputPath, slug);
        });
    }
    
    // Copier les assets
    copyAssets();
    
    console.log('✅ Build terminé !');
    console.log('📝 Note: Tous les fichiers utilisent maintenant le template templates/base.html');
}

// Exécuter le build si le script est appelé directement
if (require.main === module) {
    build();
}

module.exports = { build, convertMarkdownToHtmlWithTemplate, convertMarkdownToHtmlWithBlogTemplate }; 