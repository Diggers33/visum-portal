import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { 
  Search, 
  PlayCircle,
  Clock,
  BookOpen,
  CheckCircle2,
  Filter,
  Award,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '../ui/sheet';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { useTrainingMaterials } from '../../hooks/useData';

export default function MobileTrainingCenter() {
  const { courses, loading, error } = useTrainingMaterials();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['All Levels']);
  const [filterOpen, setFilterOpen] = useState(false);

  const categories = ['All', ...new Set(courses.map(c => c.category).filter(Boolean))];
  const levels = ['All Levels', ...new Set(courses.map(c => c.level).filter(Boolean))];

  const handleCategoryToggle = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
    } else {
      const newCategories = selectedCategories.filter(c => c !== 'All');
      if (selectedCategories.includes(category)) {
        const filtered = newCategories.filter(c => c !== category);
        setSelectedCategories(filtered.length === 0 ? ['All'] : filtered);
      } else {
        setSelectedCategories([...newCategories, category]);
      }
    }
  };

  const handleLevelToggle = (level: string) => {
    if (level === 'All Levels') {
      setSelectedLevels(['All Levels']);
    } else {
      const newLevels = selectedLevels.filter(l => l !== 'All Levels');
      if (selectedLevels.includes(level)) {
        const filtered = newLevels.filter(l => l !== level);
        setSelectedLevels(filtered.length === 0 ? ['All Levels'] : filtered);
      } else {
        setSelectedLevels([...newLevels, level]);
      }
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.includes('All') || selectedCategories.includes(course.category);
    const matchesLevel = selectedLevels.includes('All Levels') || selectedLevels.includes(course.level);
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const activeFiltersCount = 
    (selectedCategories.includes('All') ? 0 : selectedCategories.length) +
    (selectedLevels.includes('All Levels') ? 0 : selectedLevels.length);

  const totalCourses = courses.length;
  const completedCourses = courses.filter(c => c.completed_lessons === c.lesson_count).length;
  const inProgressCourses = courses.filter(c => c.completed_lessons > 0 && c.completed_lessons < c.lesson_count).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2 text-slate-900">Unable to Load Courses</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#00a8b5] hover:bg-[#008a95]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section with Stats */}
      <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
        <h1 className="mb-4">Training Center</h1>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="text-2xl mb-1">{totalCourses}</div>
            <div className="text-xs text-white/90">Courses</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="text-2xl mb-1">{completedCourses}</div>
            <div className="text-xs text-white/90">Completed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="text-2xl mb-1">{inProgressCourses}</div>
            <div className="text-xs text-white/90">In Progress</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-10 rounded-xl"
          />
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-auto bg-[#00a8b5] text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh]">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter Courses</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-140px)] pb-4">
              {/* Category Filter */}
              <div>
                <h3 className="mb-3 text-slate-900">Category</h3>
                <div className="space-y-3">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center gap-2">
                      <Checkbox
                        id={`mobile-train-cat-${cat}`}
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => handleCategoryToggle(cat)}
                      />
                      <Label htmlFor={`mobile-train-cat-${cat}`} className="text-sm">
                        {cat}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div>
                <h3 className="mb-3 text-slate-900">Level</h3>
                <div className="space-y-3">
                  {levels.map(level => (
                    <div key={level} className="flex items-center gap-2">
                      <Checkbox
                        id={`mobile-train-level-${level}`}
                        checked={selectedLevels.includes(level)}
                        onCheckedChange={() => handleLevelToggle(level)}
                      />
                      <Label htmlFor={`mobile-train-level-${level}`} className="text-sm">
                        {level}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
              <SheetClose asChild>
                <Button className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl">
                  View {filteredCourses.length} courses
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Courses List */}
      <div className="p-4 space-y-4">
        {filteredCourses.map((course) => {
          const progress = (course.completed_lessons / course.lesson_count) * 100;
          const isCompleted = course.completed_lessons === course.lesson_count;
          
          return (
            <Card key={course.id} className="overflow-hidden border-slate-200 shadow-sm">
              {/* Thumbnail */}
              <div className="relative h-32 bg-slate-200">
                {course.thumbnail_url ? (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00a8b5] to-[#008a95]">
                    <BookOpen className="h-12 w-12 text-white/50" />
                  </div>
                )}
                {isCompleted && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/60 text-white border-0 text-xs">
                    {course.content_type || 'Video Course'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="mb-2">
                  <Badge variant="outline" className="text-[10px] mb-2">
                    {course.category}
                  </Badge>
                  <h3 className="text-slate-900 leading-tight mb-1">{course.title}</h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.lesson_count} lessons
                  </div>
                  {course.level && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {course.level}
                    </Badge>
                  )}
                </div>

                {course.completed_lessons > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-slate-900">{course.completed_lessons}/{course.lesson_count}</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                )}

                <Button 
                  className={`w-full h-10 rounded-lg gap-2 ${
                    isCompleted 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-[#00a8b5] hover:bg-[#008a95]'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <Award className="h-4 w-4" />
                      View Certificate
                    </>
                  ) : course.completed_lessons > 0 ? (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Start Course
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">No courses found</div>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
