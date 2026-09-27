const { createApp, ref, reactive, onMounted, watch, computed } = Vue;

createApp({
  setup() {
    // 配置状态
    const serverUrl = ref(localStorage.getItem('metatube_url') || 'http://127.0.0.1:8080');
    const apiToken = ref(localStorage.getItem('metatube_token') || '');
    const connected = ref(false);
    const showConfigModal = ref(false);
    const embeddedServerRunning = ref(false);

    // 数据源与检索状态
    const movieProviders = ref([]);
    const selectedProvider = ref('');
    const searchQuery = ref('');
    const searchResults = ref([]);
    const loadingSearch = ref(false);
    const viewMode = ref('grid'); // 'grid' | 'table'

    // 刮削高级选项
    const searchOptions = reactive({
      fallback: true,
      lazy: true,
      autoTranslate: true,
    });

    // 详情模态框
    const activeDetailModal = ref(false);
    const currentMovie = ref({});
    const detailTab = ref('info'); // 'info' | 'gallery' | 'reviews' | 'raw'
    const translatedTitle = ref('');
    const translatedSummary = ref('');
    const isTranslating = ref(false);

    // 影评与演员
    const reviewsList = ref([]);
    const loadingReviews = ref(false);
    const activeActorModal = ref(false);
    const currentActor = ref({});
    const loadingActorName = ref(''); // 当前正在请求后台资料的演员姓名
    const actorCache = reactive({}); // 预加载缓存
    const actorLoadingMap = reactive({}); // 后台预加载追踪字典

    // 大图灯箱与前进后退
    const lightboxImage = ref(null);
    const lightboxIndex = ref(0);

    // 监听任意模态框开启状态，锁定背景界面滚动与交互
    const isAnyModalOpen = computed(() => {
      return activeDetailModal.value || activeActorModal.value || !!lightboxImage.value || showConfigModal.value;
    });

    watch(isAnyModalOpen, (isOpen) => {
      if (isOpen) {
        document.body.classList.add('overflow-hidden', 'modal-open');
        document.documentElement.classList.add('overflow-hidden', 'modal-open');
      } else {
        document.body.classList.remove('overflow-hidden', 'modal-open');
        document.documentElement.classList.remove('overflow-hidden', 'modal-open');
      }
    });

    // 图片工坊参数 (角标默认设为“无”)
    const imageLab = reactive({
      ratio: '0.667',
      autoFace: true,
      badge: '', // 默认为“无”
    });

    // 格式化纯日期 (YYYY-MM-DD)
    const formatDate = (val) => {
      if (!val) return '-';
      const str = String(val).trim();
      if (str.startsWith('0001') || str.startsWith('0000') || str === '-') {
        return '-';
      }
      if (str.includes('T')) {
        const d = str.split('T')[0];
        if (d && !d.startsWith('0001')) return d;
      }
      if (str.includes(' ')) {
        const d = str.split(' ')[0];
        if (d && !d.startsWith('0001')) return d;
      }
      const match = str.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) {
        if (match[0].startsWith('0001')) return '-';
        return match[0];
      }
      return str;
    };

    // 格式化演员生日与日期 (0001-01-01 视为无)
    const formatActorDate = (val) => {
      if (!val) return '-';
      const d = formatDate(val);
      if (d === '-' || d.startsWith('0001')) return '-';
      return d;
    };

    // 包含横版大封面海报与全部剧照的画廊集合（首位为官方横版海报）
    const allGalleryImages = computed(() => {
      const list = [];
      const m = currentMovie.value;
      const cover = m.big_cover_url || m.cover_url || m.thumb_url;
      if (cover) {
        list.push({
          url: cover,
          isCover: true,
          label: '官方展开海报 / 横版大封面',
        });
      }
      if (Array.isArray(m.preview_images)) {
        m.preview_images.forEach((img, idx) => {
          list.push({
            url: img,
            isCover: false,
            label: '剧照 #' + (idx + 1),
          });
        });
      }
      return list;
    });

    // 打开大图灯箱
    const openLightbox = (index) => {
      const list = allGalleryImages.value;
      if (index >= 0 && index < list.length) {
        lightboxIndex.value = index;
        lightboxImage.value = list[index].url;
      }
    };

    // 上一张大图
    const prevLightboxImage = () => {
      const list = allGalleryImages.value;
      if (lightboxIndex.value > 0) {
        lightboxIndex.value--;
        lightboxImage.value = list[lightboxIndex.value].url;
      }
    };

    // 下一张大图
    const nextLightboxImage = () => {
      const list = allGalleryImages.value;
      if (lightboxIndex.value < list.length - 1) {
        lightboxIndex.value++;
        lightboxImage.value = list[lightboxIndex.value].url;
      }
    };

    // 键盘左右方向键监听大图切换
    window.addEventListener('keydown', (e) => {
      if (!lightboxImage.value) return;
      if (e.key === 'ArrowLeft') {
        prevLightboxImage();
      } else if (e.key === 'ArrowRight') {
        nextLightboxImage();
      } else if (e.key === 'Escape') {
        lightboxImage.value = null;
      }
    });

    // 窗口控制逻辑 (最小化 / 最大化与还原 / 关闭)
    const isMaximized = ref(false);

    const checkMaximizeStatus = async () => {
      try {
        if (window.go && window.go.main && window.go.main.App && window.go.main.App.IsWindowMaximized) {
          isMaximized.value = await window.go.main.App.IsWindowMaximized();
        } else if (window.runtime && window.runtime.WindowIsMaximised) {
          isMaximized.value = await window.runtime.WindowIsMaximised();
        }
      } catch (e) {
        console.warn('Check maximize status error:', e);
      }
    };

    const minimizeWindow = () => {
      if (window.go && window.go.main && window.go.main.App && window.go.main.App.MinimizeWindow) {
        window.go.main.App.MinimizeWindow();
      } else if (window.runtime && window.runtime.WindowMinimise) {
        window.runtime.WindowMinimise();
      }
    };

    const toggleMaximizeWindow = async () => {
      try {
        if (window.go && window.go.main && window.go.main.App && window.go.main.App.ToggleMaximizeWindow) {
          isMaximized.value = await window.go.main.App.ToggleMaximizeWindow();
        } else if (window.runtime && window.runtime.WindowToggleMaximise) {
          window.runtime.WindowToggleMaximise();
          setTimeout(checkMaximizeStatus, 150);
        }
      } catch (e) {
        console.warn('Toggle maximize error:', e);
      }
    };

    const closeWindow = () => {
      if (window.go && window.go.main && window.go.main.App && window.go.main.App.CloseWindow) {
        window.go.main.App.CloseWindow();
      } else if (window.runtime && window.runtime.Quit) {
        window.runtime.Quit();
      }
    };

    // 监听窗口尺寸变化以同步最大化状态
    window.addEventListener('resize', () => {
      setTimeout(checkMaximizeStatus, 100);
    });

    // 获取请求 Headers
    const getHeaders = () => {
      const headers = { 'Accept': 'application/json' };
      if (apiToken.value) {
        headers['Authorization'] = 'Bearer ' + apiToken.value;
      }
      return headers;
    };

    // 检查内嵌服务状态
    const checkEmbeddedServerStatus = async () => {
      if (window.go && window.go.main && window.go.main.App) {
        try {
          const isRunning = await window.go.main.App.IsServerRunning();
          embeddedServerRunning.value = isRunning;
        } catch (e) {
          console.warn('Check server error:', e);
        }
      }
    };

    // 切换内嵌 SDK 服务
    const toggleEmbeddedServer = async () => {
      if (window.go && window.go.main && window.go.main.App) {
        try {
          if (embeddedServerRunning.value) {
            await window.go.main.App.StopServer();
            embeddedServerRunning.value = false;
            connected.value = false;
          } else {
            const res = await window.go.main.App.StartServer(8080);
            if (res) {
              embeddedServerRunning.value = true;
              await testConnection();
            }
          }
        } catch (err) {
          alert('操作内嵌服务异常: ' + err);
        }
      } else {
        alert('当前运行环境未检测到 Wails 宿主桥接，请确保通过桌面端运行。');
      }
    };

    // 打开外部链接
    const openExternal = (url) => {
      if (!url) return;
      if (window.runtime && window.runtime.BrowserOpenURL) {
        window.runtime.BrowserOpenURL(url);
      } else {
        window.open(url, '_blank');
      }
    };

    // 测试与服务端连接
    const testConnection = async () => {
      try {
        const res = await fetch(serverUrl.value + '/v1/providers', {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          connected.value = true;
          if (data.data && data.data.movie_providers) {
            movieProviders.value = Object.keys(data.data.movie_providers).map(name => ({
              name,
              label: name
            }));
          }
        } else {
          connected.value = false;
        }
      } catch (e) {
        connected.value = false;
        console.warn('MetaTube SDK 连接失败:', e);
      }
    };

    // 执行搜索与刮削
    const handleSearch = async () => {
      if (!searchQuery.value.trim()) return;
      loadingSearch.value = true;
      searchResults.value = [];

      try {
        const params = new URLSearchParams({
          q: searchQuery.value.trim(),
          fallback: searchOptions.fallback ? 'true' : 'false'
        });
        if (selectedProvider.value) {
          params.append('provider', selectedProvider.value);
        }

        const res = await fetch(serverUrl.value + '/v1/movies/search?' + params.toString(), {
          headers: getHeaders()
        });
        const json = await res.json();

        if (res.ok && json.data) {
          searchResults.value = Array.isArray(json.data) ? json.data : [json.data];
        } else {
          alert(json.error ? '刮削提示: ' + json.error.message : '未找到匹配影片');
        }
      } catch (err) {
        alert('网络请求失败，请检查 SDK 是否启动或查看连接配置: ' + err.message);
      } finally {
        loadingSearch.value = false;
      }
    };

    // 按演员搜索（关闭所有弹窗并回到主页执行搜索）
    const searchByActor = (actorName) => {
      if (!actorName) return;
      activeActorModal.value = false;
      activeDetailModal.value = false;
      lightboxImage.value = null;
      showConfigModal.value = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      searchQuery.value = actorName;
      handleSearch();
    };

    // 后台并发预加载演员详情数据
    const preloadActors = async (actors) => {
      if (!Array.isArray(actors) || actors.length === 0) return;
      actors.forEach(async (name) => {
        if (!name || actorCache[name] || actorLoadingMap[name]) return;
        actorLoadingMap[name] = true;
        try {
          const searchUrl = serverUrl.value + '/v1/actors/search?q=' + encodeURIComponent(name);
          const res = await fetch(searchUrl, { headers: getHeaders() });
          const json = await res.json();
          if (res.ok && json.data && json.data.length > 0) {
            const first = json.data[0];
            const detailUrl = serverUrl.value + '/v1/actors/' + encodeURIComponent(first.provider) + '/' + encodeURIComponent(first.id);
            const dRes = await fetch(detailUrl, { headers: getHeaders() });
            const dJson = await dRes.json();
            actorCache[name] = dJson.data || first;
          }
        } catch (e) {
          console.warn('预加载演员资料失败:', name, e);
        } finally {
          actorLoadingMap[name] = false;
        }
      });
    };

    // 获取影片完整刮削详情
    const fetchMovieDetail = async (provider, id) => {
      translatedTitle.value = '';
      translatedSummary.value = '';
      imageLab.badge = ''; // 默认为“无”

      try {
        const url = serverUrl.value + '/v1/movies/' + encodeURIComponent(provider) + '/' + encodeURIComponent(id) + '?lazy=' + searchOptions.lazy;
        const res = await fetch(url, { headers: getHeaders() });
        const json = await res.json();
        if (res.ok && json.data) {
          currentMovie.value = json.data;
          activeDetailModal.value = true;
          detailTab.value = 'info';
          if (searchOptions.autoTranslate) {
            translateTitleAndSummary();
          }
          // 进入详情页时自动在后台预加载所有主演详情数据
          if (currentMovie.value.actors && currentMovie.value.actors.length > 0) {
            preloadActors(currentMovie.value.actors);
          }
        } else {
          alert('获取影片详情失败: ' + (json.error ? json.error.message : '未知错误'));
        }
      } catch (e) {
        alert('获取详情失败: ' + e.message);
      }
    };

    // 获取影评 (GET /v1/reviews/:provider/:id)
    const fetchReviews = async (provider, id) => {
      reviewsList.value = [];
      loadingReviews.value = true;

      try {
        const url = serverUrl.value + '/v1/reviews/' + encodeURIComponent(provider) + '/' + encodeURIComponent(id);
        const res = await fetch(url, { headers: getHeaders() });
        const json = await res.json();
        if (res.ok && json.data) {
          reviewsList.value = json.data || [];
        }
      } catch (e) {
        console.warn(e);
      } finally {
        loadingReviews.value = false;
      }
    };

    // 联动查询女优/演员详情 (GET /v1/actors/search & GET /v1/actors/:provider/:id)
    const searchActorDetail = async (name) => {
      if (!name) return;
      // 1. 如果已有预加载缓存，直接秒开！
      if (actorCache[name]) {
        currentActor.value = actorCache[name];
        activeActorModal.value = true;
        return;
      }

      // 2. 如果后台正在预加载中，等待预加载完成
      loadingActorName.value = name;
      try {
        if (actorLoadingMap[name]) {
          let waitCount = 0;
          while (actorLoadingMap[name] && waitCount < 30) {
            await new Promise(r => setTimeout(r, 100));
            waitCount++;
          }
          if (actorCache[name]) {
            currentActor.value = actorCache[name];
            activeActorModal.value = true;
            return;
          }
        }

        // 3. 后台未命中，手动发起请求
        const searchUrl = serverUrl.value + '/v1/actors/search?q=' + encodeURIComponent(name);
        const res = await fetch(searchUrl, { headers: getHeaders() });
        const json = await res.json();
        if (res.ok && json.data && json.data.length > 0) {
          const first = json.data[0];
          const detailUrl = serverUrl.value + '/v1/actors/' + encodeURIComponent(first.provider) + '/' + encodeURIComponent(first.id);
          const dRes = await fetch(detailUrl, { headers: getHeaders() });
          const dJson = await dRes.json();
          actorCache[name] = dJson.data || first;
          currentActor.value = actorCache[name];
          activeActorModal.value = true;
        } else {
          alert('未在演员数据库中检索到 "' + name + '" 的独立档案');
        }
      } catch (e) {
        alert('查询演员信息出错: ' + e.message);
      } finally {
        loadingActorName.value = '';
      }
    };

    // 翻译片名与简介 (GET /v1/translate)
    const translateTitleAndSummary = async () => {
      if (!currentMovie.value.title) return;
      isTranslating.value = true;

      try {
        const tUrl = serverUrl.value + '/v1/translate?q=' + encodeURIComponent(currentMovie.value.title) + '&from=auto&to=zh-CN&engine=googlefree';
        const res = await fetch(tUrl);
        const data = await res.json();
        if (data.data) {
          translatedTitle.value = data.data.translated_text;
        }

        if (currentMovie.value.summary) {
          const sUrl = serverUrl.value + '/v1/translate?q=' + encodeURIComponent(currentMovie.value.summary) + '&from=auto&to=zh-CN&engine=googlefree';
          const sRes = await fetch(sUrl);
          const sData = await sRes.json();
          if (sData.data) {
            translatedSummary.value = sData.data.translated_text;
          }
        }
      } catch (e) {
        console.error('翻译出错:', e);
      } finally {
        isTranslating.value = false;
      }
    };

    // 图片代理路径生成 (利用 SDK 的 /v1/images/primary/:provider/:id)
    const getImageProxy = (provider, id, fallbackUrl) => {
      if (!provider || !id) return fallbackUrl || '';
      return serverUrl.value + '/v1/images/primary/' + encodeURIComponent(provider) + '/' + encodeURIComponent(id);
    };

    // 图像处理工坊图片 URL (带上 ratio, auto, badge 参数)
    const getProcessedImageUrl = (movie) => {
      if (!movie.cover_url && !movie.thumb_url) return '';

      const params = new URLSearchParams({
        ratio: imageLab.ratio,
        auto: imageLab.autoFace ? 'true' : 'false',
      });
      if (imageLab.badge) {
        params.append('badge', imageLab.badge);
      }
      return serverUrl.value + '/v1/images/primary/' + encodeURIComponent(movie.provider) + '/' + encodeURIComponent(movie.id) + '?' + params.toString();
    };

    // 处理图片加载失败
    const handleImageError = (e) => {
      e.target.src = 'https://placehold.co/400x600/1e293b/94a3b8?text=Image+Unavailable';
    };

    // 生成 Kodi / Jellyfin / Emby 标准 NFO XML 格式
    const generateNFOXml = () => {
      const m = currentMovie.value;
      const actorsXml = (m.actors || []).map(a => '    <actor>\n        <name>' + a + '</name>\n        <type>Actor</type>\n    </actor>').join('\n');
      const genresXml = (m.genres || []).map(g => '    <genre>' + g + '</genre>').join('\n');

      return '<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n' +
'<movie>\n' +
'    <title>' + (translatedTitle.value || m.title || '') + '</title>\n' +
'    <originaltitle>' + (m.title || '') + '</originaltitle>\n' +
'    <num>' + (m.number || '') + '</num>\n' +
'    <premiered>' + (formatDate(m.release_date) !== '-' ? formatDate(m.release_date) : '') + '</premiered>\n' +
'    <releasedate>' + (formatDate(m.release_date) !== '-' ? formatDate(m.release_date) : '') + '</releasedate>\n' +
'    <runtime>' + (m.runtime || 0) + '</runtime>\n' +
'    <plot>' + (translatedSummary.value || m.summary || '') + '</plot>\n' +
'    <studio>' + (m.maker || '') + '</studio>\n' +
'    <label>' + (m.label || '') + '</label>\n' +
'    <series>' + (m.series || '') + '</series>\n' +
'    <director>' + (m.director || '') + '</director>\n' +
'    <rating>' + (m.score || 0) + '</rating>\n' +
genresXml + '\n' +
actorsXml + '\n' +
'    <uniqueid type="' + (m.provider || 'metatube') + '" default="true">' + (m.id || '') + '</uniqueid>\n' +
'    <source>' + (m.provider || '') + '</source>\n' +
'    <website>' + (m.homepage || '') + '</website>\n' +
'</movie>';
    };

    // 复制 NFO
    const copyNFO = () => {
      const xml = generateNFOXml();
      if (window.go && window.go.main && window.go.main.App) {
        window.go.main.App.SetClipboard(xml).then(() => {
          alert('已通过 Wails 剪贴板复制 Emby / Jellyfin 兼容的 NFO 内容！');
        });
      } else {
        navigator.clipboard.writeText(xml).then(() => {
          alert('已成功复制 Emby / Jellyfin 兼容的 NFO 内容到剪贴板！');
        });
      }
    };

    // 下载 / 保存 NFO 文件
    const downloadNFOFile = async () => {
      const xml = generateNFOXml();
      const defaultFilename = (currentMovie.value.number || 'movie') + '.nfo';
      if (window.go && window.go.main && window.go.main.App) {
        try {
          const savedPath = await window.go.main.App.SaveNFOFileDialog(defaultFilename, xml);
          if (savedPath) {
            alert('NFO 文件已成功保存至:\n' + savedPath);
            return;
          }
        } catch (e) {
          console.warn('Wails file save canceled or failed:', e);
        }
      }

      // 浏览器标准下载 fallback
      const blob = new Blob([xml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      a.click();
      URL.revokeObjectURL(url);
    };

    // 复制 JSON
    const copyJson = () => {
      const content = JSON.stringify(currentMovie.value, null, 2);
      if (window.go && window.go.main && window.go.main.App) {
        window.go.main.App.SetClipboard(content).then(() => {
          alert('已通过 Wails 剪贴板复制 JSON 原始数据！');
        });
      } else {
        navigator.clipboard.writeText(content).then(() => {
          alert('已复制 JSON 原始数据到剪贴板！');
        });
      }
    };

    // 保存连接配置
    const saveConfig = () => {
      localStorage.setItem('metatube_url', serverUrl.value);
      localStorage.setItem('metatube_token', apiToken.value);
      showConfigModal.value = false;
      testConnection();
    };

    onMounted(async () => {
      setTimeout(async () => {
        await checkEmbeddedServerStatus();
        await testConnection();
        if (!connected.value) {
          setTimeout(async () => {
            await checkEmbeddedServerStatus();
            await testConnection();
          }, 1200);
        }
      }, 300);
    });

    return {
      isMaximized,
      minimizeWindow,
      toggleMaximizeWindow,
      closeWindow,
      serverUrl,
      apiToken,
      connected,
      showConfigModal,
      embeddedServerRunning,
      movieProviders,
      selectedProvider,
      searchQuery,
      searchResults,
      loadingSearch,
      viewMode,
      searchOptions,
      activeDetailModal,
      currentMovie,
      detailTab,
      translatedTitle,
      translatedSummary,
      isTranslating,
      reviewsList,
      loadingReviews,
      activeActorModal,
      currentActor,
      loadingActorName,
      actorCache,
      actorLoadingMap,
      preloadActors,
      lightboxImage,
      lightboxIndex,
      allGalleryImages,
      imageLab,
      formatDate,
      formatActorDate,
      openLightbox,
      prevLightboxImage,
      nextLightboxImage,
      testConnection,
      toggleEmbeddedServer,
      openExternal,
      handleSearch,
      searchByActor,
      fetchMovieDetail,
      fetchReviews,
      searchActorDetail,
      translateTitleAndSummary,
      getImageProxy,
      getProcessedImageUrl,
      handleImageError,
      copyNFO,
      downloadNFOFile,
      copyJson,
      saveConfig
    };
  }
}).mount('#app');
