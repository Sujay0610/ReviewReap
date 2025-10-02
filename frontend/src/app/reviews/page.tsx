'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Star, MessageSquare, TrendingUp, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';

interface Review {
  id: string;
  rating: number;
  text: string;
  author_name: string;
  review_date: string;
  response_text?: string;
  response_date?: string;
  source: string;
  guests?: {
    name: string;
    email: string;
    phone: string;
    room_type: string;
  };
}

interface ReviewAnalytics {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  response_rate: number;
  avg_response_time_hours?: number;
  recent_reviews: Review[];
}

interface ConnectionStatus {
  connected: boolean;
  place_id?: string;
  business_name?: string;
  last_sync?: string;
  error_message?: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [respondingToReview, setRespondingToReview] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [currentPage, ratingFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadConnectionStatus(),
        loadReviews(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reviews data');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const response = await fetch('/api/google/connection-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20'
      });
      
      if (ratingFilter !== 'all') {
        params.append('rating_filter', ratingFilter);
      }
      
      const response = await fetch(`/api/google/reviews?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/google/reviews/analytics?days=30', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const connectGoogleAPI = async () => {
    if (!apiKey || !placeId) {
      toast.error('Please provide both API key and Place ID');
      return;
    }

    try {
      setConnecting(true);
      const response = await fetch('/api/google/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          api_key: apiKey,
          place_id: placeId
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Google API connected successfully!');
        setShowConnectionDialog(false);
        setApiKey('');
        setPlaceId('');
        await loadConnectionStatus();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to connect Google API');
      }
    } catch (error) {
      console.error('Error connecting Google API:', error);
      toast.error('Failed to connect Google API');
    } finally {
      setConnecting(false);
    }
  };

  const syncReviews = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.new_reviews} new reviews and updated ${data.updated_reviews} existing reviews`);
        await loadData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to sync reviews');
      }
    } catch (error) {
      console.error('Error syncing reviews:', error);
      toast.error('Failed to sync reviews');
    } finally {
      setSyncing(false);
    }
  };

  const generateResponse = async (reviewId: string, tone: string = 'professional') => {
    try {
      setGeneratingResponse(true);
      const response = await fetch(`/api/google/reviews/${reviewId}/generate-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          review_id: reviewId,
          tone: tone
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResponseText(data.response_text);
        toast.success('Response generated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to generate response');
      }
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate response');
    } finally {
      setGeneratingResponse(false);
    }
  };

  const postResponse = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      setRespondingToReview(true);
      const response = await fetch(`/api/google/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          response_text: responseText
        })
      });

      if (response.ok) {
        toast.success('Response posted successfully!');
        setSelectedReview(null);
        setResponseText('');
        await loadReviews();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to post response');
      }
    } catch (error) {
      console.error('Error posting response:', error);
      toast.error('Failed to post response');
    } finally {
      setRespondingToReview(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-24 -translate-y-24"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-18 translate-y-18"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                    <Star className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-3">
                    Google Reviews
                  </h1>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Manage and respond to your Google reviews with AI-powered insights
                  </p>
                </div>
                <div className="flex gap-2">
          {connectionStatus?.connected ? (
            <Button onClick={syncReviews} disabled={syncing} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg">
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Reviews
            </Button>
          ) : (
            <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg">Connect Google API</Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-white to-purple-50 border-purple-200">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">Connect Google My Business</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Enter your Google Places API key and Place ID to start syncing reviews.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey" className="text-gray-700 font-medium">Google Places API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Google Places API key"
                      className="bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="placeId" className="text-gray-700 font-medium">Google Place ID</Label>
                    <Input
                      id="placeId"
                      value={placeId}
                      onChange={(e) => setPlaceId(e.target.value)}
                      placeholder="Enter your Google Place ID"
                      className="bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <Button onClick={connectGoogleAPI} disabled={connecting} className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg">
                    {connecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Connect
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">

      {!connectionStatus?.connected && (
        <Alert className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <AlertDescription className="text-purple-800">
            Connect your Google My Business account to start managing reviews.
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus?.connected && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-white to-purple-50 shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reviews</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{analytics.total_reviews}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-yellow-50 shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{analytics.average_rating}</div>
              <div className="flex mt-1">
                {renderStars(Math.round(analytics.average_rating))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-green-50 shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Response Rate</CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{analytics.response_rate}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-purple-50 shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.avg_response_time_hours ? 
                  `${Math.round(analytics.avg_response_time_hours)}h` : 'N/A'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
        <Tabs defaultValue="reviews" className="space-y-6">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 pt-6">
            <TabsList className="bg-white shadow-md border-0">
              <TabsTrigger value="reviews" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-black">Reviews</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-black">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="reviews" className="space-y-6 px-6 pb-6">
            <div className="flex items-center gap-4">
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-48 bg-white shadow-sm border-gray-200 text-gray-900">
                  <SelectValue placeholder="Filter by rating" className="text-gray-900" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all" className="text-gray-900 hover:bg-purple-50">All Ratings</SelectItem>
                  <SelectItem value="5" className="text-gray-900 hover:bg-purple-50">5 Stars</SelectItem>
                  <SelectItem value="4" className="text-gray-900 hover:bg-purple-50">4 Stars</SelectItem>
                  <SelectItem value="3" className="text-gray-900 hover:bg-purple-50">3 Stars</SelectItem>
                  <SelectItem value="2" className="text-gray-900 hover:bg-purple-50">2 Stars</SelectItem>
                  <SelectItem value="1" className="text-gray-900 hover:bg-purple-50">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-gradient-to-br from-white to-gray-50 shadow-md border-0 hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{review.author_name}</h3>
                        <Badge variant="outline">{review.source}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(review.review_date)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setResponseText(review.response_text || '');
                      }}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
                    >
                      {review.response_text ? 'View Response' : 'Respond'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{review.text}</p>
                  {review.response_text && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Your Response:</p>
                      <p className="text-sm">{review.response_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Responded on {formatDate(review.response_date!)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="px-6 pb-6">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-white to-blue-50 shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-gray-900">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <div className="flex items-center gap-1 w-16">
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${analytics.total_reviews > 0 ? 
                                (analytics.rating_distribution[rating] / analytics.total_reviews) * 100 : 0
                              }%`
                            }}
                          />
                        </div>
                        <span className="text-sm w-8 font-medium text-gray-700">
                          {analytics.rating_distribution[rating] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-green-50 shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-gray-900">Recent Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recent_reviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{review.author_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {review.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(review.review_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        </Tabs>
      </Card>

      {/* Response Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-purple-50 border-purple-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">Respond to Review</DialogTitle>
            <DialogDescription>
              {selectedReview && (
                <div className="space-y-3 p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{selectedReview.author_name}</span>
                    <div className="flex">{renderStars(selectedReview.rating)}</div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedReview.text}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => selectedReview && generateResponse(selectedReview.id, 'professional')}
                disabled={generatingResponse}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
              >
                {generatingResponse ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Generate Professional
              </Button>
              <Button
                size="sm"
                onClick={() => selectedReview && generateResponse(selectedReview.id, 'friendly')}
                disabled={generatingResponse}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
              >
                Generate Friendly
              </Button>
              <Button
                size="sm"
                onClick={() => selectedReview && generateResponse(selectedReview.id, 'apologetic')}
                disabled={generatingResponse}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
              >
                Generate Apologetic
              </Button>
            </div>
            <div>
              <Label htmlFor="response" className="text-gray-700 font-medium">Your Response</Label>
              <Textarea
                id="response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response to this review..."
                rows={4}
                className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedReview && postResponse(selectedReview.id)}
                disabled={respondingToReview || !responseText.trim()}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
              >
                {respondingToReview ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Post Response
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </Layout>
  );
}